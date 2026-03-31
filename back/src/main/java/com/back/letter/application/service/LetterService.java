package com.back.letter.application.service;

import com.back.ai.adapter.in.web.dto.AuditAiRequest;
import com.back.ai.application.service.AiService;
import com.back.global.event.LetterNotificationEvent;
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
import org.springframework.cache.Cache;
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
@Transactional(readOnly = true)
public class LetterService implements SendLetterUseCase, InquiryLetterUseCase {

    private final LetterPort letterPort;
    private final MemberRepository memberRepository;
    private final AiService aiService;
    private final ApplicationEventPublisher eventPublisher;
    private final LetterRedisRepository letterRedisRepository;

    private final RedisTemplate<String, Object> redisTemplate;
    private final org.springframework.cache.CacheManager cacheManager;
    /**
     * [AI 검수 로직]
     */
    private void auditContent(String content, String type) {
        var auditResponse = aiService.auditContent(new AuditAiRequest(content, type));

        if (!auditResponse.isPassed()) {
            throw new ServiceException("400-AI", auditResponse.message());
        }
    }

    /**
     * [고민 편지 작성 및 즉시 랜덤 발송]
     */
    @Override
    @Transactional
    public long createLetterAndDirectSendLetter(CreateLetterReq req, long senderId) {
        String limitKey = "user:send:limit:" + senderId;

        // 원자적 체크 및 락 설정
        Boolean isFirstRequest = redisTemplate.opsForValue()
                .setIfAbsent(limitKey, "LOCKED", Duration.ofMinutes(1));

        if (Boolean.FALSE.equals(isFirstRequest)) {
            throw new ServiceException("429-1", "편지는 1분에 한 번만 보낼 수 있습니다.");
        }

        // 1. AI 검수
        String fullContent = String.format("[제목] %s [내용] %s", req.title(), req.content());
        auditContent(fullContent, "Letter");

        // 2. 발신자 조회
        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));

        // 3. 랜덤 수신자 매칭
        Long receiverId = letterRedisRepository.getRandomReceiver();
        Member receiver;

        if (receiverId == null || receiverId.equals(senderId)) {
            receiver = letterPort.findRandomMemberExceptMe(senderId)
                    .orElseThrow(() -> new ServiceException("404-2", "매칭 가능한 회원이 없습니다."));
        } else {
            receiver = memberRepository.findById(receiverId)
                    .orElseGet(() -> letterPort.findRandomMemberExceptMe(senderId)
                            .orElseThrow(() -> new ServiceException("404-2", "매칭 가능한 회원이 없습니다.")));
        }

        // 4. 편지 생성 및 저장
        Letter letter = Letter.builder()
                .title(req.title())
                .content(req.content())
                .sender(sender)
                .receiver(receiver)
                .status(LetterStatus.SENT)
                .build();

        Letter saved = letterPort.save(letter);

        // 5. 알림 이벤트 발행
        eventPublisher.publishEvent(new LetterNotificationEvent(
                receiver.getId(),
                "new_letter",
                "새로운 랜덤 편지가 도착했습니다!"
        ));

        // 6. 수신자의 통계 캐시 무효화 (수동 처리)
        Cache cache = cacheManager.getCache("mailboxStats");
        if (cache != null) {
            cache.evict(receiver.getId());
        }

        return saved.getId();
    }

    /**
     * [편지 단건 조회]
     */
    @Override
    public LetterInfoRes getLetter(long id, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        if (!letter.getSender().getId().equals(accessorId) && !letter.getReceiver().getId().equals(accessorId)) {
            throw new ServiceException("403-1", "이 편지를 볼 권한이 없습니다.");
        }

        return LetterInfoRes.from(letter);
    }

    /**
     * [답장 작성]
     */
    @Override
    @Transactional
    public void replyLetter(long id, ReplyLetterReq req, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        if (!letter.getReceiver().getId().equals(accessorId)) {
            throw new ServiceException("403-2", "본인이 받은 편지에만 답장할 수 있습니다.");
        }

        auditContent(req.replyContent(), "Reply");
        letter.reply(req.replyContent());

        letterRedisRepository.deleteWritingStatus(id);

        Cache cache = cacheManager.getCache("mailboxStats");
        if (cache != null) {
            cache.evict(letter.getSender().getId());
            cache.evict(accessorId);
        }

        eventPublisher.publishEvent(new LetterNotificationEvent(
                letter.getSender().getId(),
                "reply_arrival",
                "보낸 편지에 답장이 도착했습니다!"
        ));
    }

    /**
     * [보관함 조회 로직들]
     */
    @Override
    public LetterListRes getMyInbox(long memberId, int page, int size) {
        Page<Letter> letterPage = letterPort.findByReceiverId(memberId, getPageable(page, size));
        return getLetterList(letterPage);
    }

    @Override
    @Cacheable(value = "mailboxStats", key = "#memberId", cacheManager = "monthlyCalendarCacheManager")
    public LettersStatsRes getMailboxStats(long memberId) {
        long receivedCount = letterPort.countByReceiverId(memberId);

        LettersStatsRes.LetterSummary latestReceived = letterPort.findLatestReceived(memberId)
                .map(l -> LettersStatsRes.LetterSummary.builder()
                        .id(l.getId())
                        .title(l.getTitle())
                        .createdDate(l.getCreateDate().toString())
                        .replied(l.getStatus() == LetterStatus.REPLIED)
                        .build())
                .orElse(null);

        LettersStatsRes.LetterSummary latestSent = letterPort.findLatestSent(memberId)
                .map(l -> LettersStatsRes.LetterSummary.builder()
                        .id(l.getId())
                        .title(l.getTitle())
                        .createdDate(l.getCreateDate().toString())
                        .build())
                .orElse(null);

        return LettersStatsRes.builder()
                .receivedCount(receivedCount)
                .latestReceivedLetter(latestReceived)
                .latestSentLetter(latestSent)
                .build();
    }

    @Override
    public LetterListRes getMySentBox(long memberId, int page, int size) {
        Page<Letter> letterPage = letterPort.findBySenderId(memberId, getPageable(page, size));
        return getLetterList(letterPage);
    }

    private Pageable getPageable(int page, int size) {
        return PageRequest.of(page, size, Sort.by("id").descending());
    }

    private LetterListRes getLetterList(Page<Letter> letterPage) {
        return LetterListRes.from(letterPage.map(letter -> {
            boolean isWriting = letterRedisRepository.isWriting(letter.getId());
            return LetterItem.from(letter, isWriting);
        }));
    }

    @Override
    @Transactional
    public void acceptLetter(long id, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        if (!letter.getReceiver().getId().equals(accessorId)) {
            throw new ServiceException("403-2", "권한이 없습니다.");
        }

        if (letter.getStatus() == LetterStatus.SENT) {
            letter.setStatus(LetterStatus.ACCEPTED);

            // 수신자의 캐시 갱신 (읽음 상태가 바뀌었으므로)
            Cache cache = cacheManager.getCache("mailboxStats");
            if (cache != null) {
                cache.evict(accessorId);
            }
        }

        eventPublisher.publishEvent(new LetterNotificationEvent(
                letter.getSender().getId(),
                "letter_read",
                "상대방이 당신의 편지를 읽었습니다."
        ));
    }

    @Override
    @Transactional
    public void updateWritingStatus(long id) {
        letterRedisRepository.setWritingStatus(id);

        Letter letter = letterPort.findById(id).orElse(null);
        if (letter != null) {
            eventPublisher.publishEvent(new LetterNotificationEvent(
                    letter.getSender().getId(),
                    "writing_status", // 프론트엔드 리스너와 일치시킴
                    "상대방이 답장을 작성하고 있습니다."
            ));
        }
    }

    @Override
    public String getLiveStatus(long id) {
        if (letterRedisRepository.isWriting(id)) {
            return "WRITING";
        }
        return letterPort.findById(id)
                .map(l -> l.getStatus().name())
                .orElse("NONE");
    }

    @Override
    @Transactional
    public void reassignUnreadLetters() {
        //테스트 시 1분 사용
//        LocalDateTime expirationTime = LocalDateTime.now().minusMinutes(1);
        LocalDateTime expirationTime = LocalDateTime.now().minusHours(12);
        List<Letter> expiredLetters = letterPort.findUnreadLettersExceeding(expirationTime);

        if (expiredLetters.isEmpty()) {
            System.out.println("===> [재매칭 스케줄러] 대상 편지가 없습니다.");
            return;
        }

        System.out.println("===> [재매칭 스케줄러] 미수신 편지 발견: " + expiredLetters.size() + "건");

        for (Letter letter : expiredLetters) {
            Long oldReceiverId = letter.getReceiver().getId();
            String oldReceiverName = letter.getReceiver().getNickname(); // 기존 수신자
            long letterId = letter.getId();

            letterPort.findRandomMemberExceptMe(letter.getSender().getId())
                    .ifPresentOrElse(newReceiver -> {
                        letter.reassignReceiver(newReceiver);

                        System.out.println(String.format(
                                "    [SUCCESS] 편지 ID: %d | 발신자: %s | 기존 수신자: %s -> 새 수신자: %s",
                                letterId,
                                letter.getSender().getNickname(),
                                oldReceiverName,
                                newReceiver.getNickname()
                        ));

                        Cache cache = cacheManager.getCache("mailboxStats");
                        if (cache != null) {
                            cache.evict(oldReceiverId); // 기존 수신자 캐시 삭제
                            cache.evict(newReceiver.getId()); // 새 수신자 캐시 삭제
                        }
                        eventPublisher.publishEvent(new LetterNotificationEvent(
                                newReceiver.getId(),
                                "new_letter",
                                "새로운 랜덤 편지가 도착했습니다!"
                        ));
                    }, () -> {
                        System.out.println("    [FAIL] 편지 ID: " + letterId + " - 매칭 가능한 새로운 유저가 없습니다.");
                    });
        }
        System.out.println("===> [재매칭 스케줄러] 모든 처리 완료");
    }
}
