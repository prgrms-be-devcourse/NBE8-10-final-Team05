package com.back.letter.application.service;



import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.application.service.AiService;
import com.back.global.event.LetterEvents;
import com.back.global.exception.ServiceException;
import com.back.letter.adapter.out.persistence.repository.LetterRedisRepository;
import com.back.letter.application.port.in.*;
import com.back.letter.application.port.in.dto.*;
import com.back.letter.application.port.out.LetterPort;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class LetterService implements SendLetterUseCase, InquiryLetterUseCase {

    private final LetterPort letterPort;
    private final MemberRepository memberRepository;
    private final AiService aiService;
    private final ApplicationEventPublisher eventPublisher;
    private final LetterRedisRepository letterRedisRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    @Transactional
    public long createLetterAndDirectSendLetter(CreateLetterReq req, long senderId) {
        auditContent(String.format("[제목] %s [내용] %s", req.title(), req.content()), "Letter");
        checkSendRateLimit(senderId);

        return saveAndDispatch(req, senderId);
    }


    public long saveAndDispatch(CreateLetterReq req, long senderId) {
        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));

        Member receiver = findMatchingReceiver(senderId);

        Letter letter = Letter.builder()
                .title(req.title())
                .content(req.content())
                .sender(sender)
                .build();

        letter.dispatch(receiver);
        Letter saved = letterPort.save(letter);

        eventPublisher.publishEvent(new LetterEvents.LetterSentEvent(saved.getId(), receiver.getId()));
        return saved.getId();
    }

    @Override
    @Transactional
    public void replyLetter(long id, ReplyLetterReq req, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        auditContent(req.replyContent(), "Reply");

        letter.reply(req.replyContent(), accessorId);

        letterRedisRepository.deleteWritingStatus(id);
        eventPublisher.publishEvent(new LetterEvents.LetterRepliedEvent(id, letter.getSender().getId(), accessorId));
    }

    @Override
    @Transactional
    public void acceptLetter(long id, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        letter.accept(accessorId);

        eventPublisher.publishEvent(new LetterEvents.LetterAcceptedEvent(id, letter.getSender().getId()));
    }

    @Override
    @Transactional
    public void rejectLetter(long id, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        // 1. 도메인 로직: 수신자 비우고 상태 초기화
        letter.reject(accessorId);

        // 2. 발송자(sender)와 거절자(accessorId) 둘 다 제외하고 새 수신자 찾기
        // LetterRepository에 List<Long>을 받는 findRandomMemberExcept 메서드가 있어야 합니다.
        Member newReceiver = letterPort.findRandomMemberExceptMe(
                List.of(letter.getSender().getId(), accessorId)
        ).orElseThrow(() -> new ServiceException("404-2", "편지를 전달할 수 있는 다른 유저가 없습니다."));

        // 3. 재배달
        letter.dispatch(newReceiver);

        // 알림 이벤트 발행 등
        eventPublisher.publishEvent(new LetterEvents.LetterSentEvent(letter.getId(), newReceiver.getId()));
    }

    @Override
    @Transactional
    public void updateWritingStatus(long id) {
        letterRedisRepository.setWritingStatus(id);

        letterPort.findById(id).ifPresent(letter -> {
            eventPublisher.publishEvent(new LetterEvents.LetterWritingEvent(id, letter.getSender().getId()));
        });
    }

    @Override
    @Transactional
    public void reassignUnreadLetters() {
        LocalDateTime expirationTime = LocalDateTime.now().minusHours(12);
        List<Letter> expiredLetters = letterPort.findUnreadLettersExceeding(expirationTime);

        for (Letter letter : expiredLetters) {
            letterPort.findRandomMemberExceptMe(List.of(letter.getSender().getId()))
                    .ifPresent(newReceiver -> {
                        letter.reassignReceiver(newReceiver);
                        eventPublisher.publishEvent(new LetterEvents.LetterSentEvent(letter.getId(), newReceiver.getId()));
                    });
        }
    }

    @Override
    @Transactional
    public LetterInfoRes getLetter(long id, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        return LetterInfoRes.from(letter);
    }

    @Override
    public LetterListRes getMyInbox(long memberId, int page, int size) {
        Page<Letter> letterPage = letterPort.findByReceiverId(memberId, PageRequest.of(page, size, Sort.by("id").descending()));
        return LetterListRes.from(letterPage.map(l -> LetterItem.from(l, letterRedisRepository.isWriting(l.getId()))));
    }

    @Override
    public LetterListRes getMySentBox(long memberId, int page, int size) {
        Page<Letter> letterPage = letterPort.findBySenderId(memberId, PageRequest.of(page, size, Sort.by("id").descending()));
        return LetterListRes.from(letterPage.map(l -> LetterItem.from(l, letterRedisRepository.isWriting(l.getId()))));
    }

    @Override
    @Cacheable(value = "mailboxStats", key = "#memberId", cacheManager = "monthlyCalendarCacheManager")
    public LettersStatsRes getMailboxStats(long memberId) {
        long receivedCount = letterPort.countByReceiverId(memberId);
        return LettersStatsRes.builder()
                .receivedCount(receivedCount)
                .latestReceivedLetter(letterPort.findLatestReceived(memberId).map(l -> LettersStatsRes.LetterSummary.from(l, l.getStatus() == LetterStatus.REPLIED)).orElse(null))
                .latestSentLetter(letterPort.findLatestSent(memberId).map(l -> LettersStatsRes.LetterSummary.from(l, false)).orElse(null))
                .build();
    }

    @Override
    public String getLiveStatus(long id) {
        if (letterRedisRepository.isWriting(id)) return "WRITING";
        return letterPort.findById(id).map(l -> l.getStatus().name()).orElse("NONE");
    }

    private void checkSendRateLimit(long senderId) {
        String limitKey = "user:send:limit:" + senderId;
        if (Boolean.FALSE.equals(redisTemplate.opsForValue().setIfAbsent(limitKey, "LOCKED", Duration.ofMinutes(1)))) {
            throw new ServiceException("429-1", "편지는 1분에 한 번만 보낼 수 있습니다.");
        }
    }

    private void auditContent(String content, String type) {
        var response = aiService.auditContent(new AuditAiRequest(content, type));
        if (!response.isPassed()) throw new ServiceException("400-AI", response.message());
    }

    private Member findMatchingReceiver(long senderId) {
        Long rId = letterRedisRepository.getRandomReceiver();
        if (rId != null && !rId.equals(senderId)) {
            return memberRepository.findById(rId)
                    .orElseGet(() -> letterPort.findRandomMemberExceptMe(List.of(senderId))
                            .orElseThrow(() -> new ServiceException("404-1", "수신 가능한 사용자가 없습니다.")));
        }
        return letterPort.findRandomMemberExceptMe(List.of(senderId))
                .orElseThrow(() -> new ServiceException("404-1", "수신 가능한 사용자가 없습니다."));
    }
}
