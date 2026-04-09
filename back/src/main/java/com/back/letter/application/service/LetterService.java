package com.back.letter.application.service;



import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.censorship.application.service.AiService;
import com.back.global.event.LetterEvents;
import com.back.global.exception.ServiceException;
import com.back.letter.adapter.out.persistence.repository.LetterRedisRepository;
import com.back.letter.adapter.out.persistence.repository.LetterAdminActionLogRepository;
import com.back.letter.application.port.in.*;
import com.back.letter.application.port.in.dto.*;
import com.back.letter.application.port.out.LetterPort;
import com.back.letter.domain.AdminLetterActionType;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.application.MemberService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class LetterService implements SendLetterUseCase, InquiryLetterUseCase, AdminLetterUseCase {

    private final LetterPort letterPort;
    private final MemberRepository memberRepository;
    private final AiService aiService;
    private final ApplicationEventPublisher eventPublisher;
    private final LetterRedisRepository letterRedisRepository;
    private final LetterAdminActionLogRepository letterAdminActionLogRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final MemberService memberService;

    @Override
    @Transactional
    public long createLetterAndDirectSendLetter(CreateLetterReq req, long senderId) {
        checkSendRateLimit(senderId);
        AuditAiResponse response;

        try {
            response = auditContent(String.format("[제목] %s [내용] %s", req.title(), req.content()), "Letter");
        } catch (ServiceException e) {
            redisTemplate.delete("user:send:limit:" + senderId);
            throw e;
        }
        return saveAndDispatch(req, senderId, response.summary());
    }


    public long saveAndDispatch(CreateLetterReq req, long senderId, String summary) {
        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));

        Member receiver = findMatchingReceiver(senderId);

        Letter letter = Letter.builder()
                .title(req.title())
                .content(req.content())
                .summary(summary)
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

        AuditAiResponse response =auditContent(req.replyContent(), "Reply");

        letter.reply(req.replyContent(), response.summary(), accessorId);

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
    @Transactional(readOnly = true)
    public AdminLetterListRes getAdminLetters(String status, String query, int page, int size) {
        String normalizedQuery = normalizeQuery(query);
        boolean onlyUnassigned = "UNASSIGNED".equalsIgnoreCase(status);
        LetterStatus statusFilter = resolveStatusFilter(status, onlyUnassigned);
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Direction.DESC, "createDate"));

        Page<Letter> letterPage = normalizedQuery == null
                ? letterPort.findAdminLetters(
                        statusFilter,
                        onlyUnassigned,
                        pageable)
                : letterPort.searchAdminLetters(
                        normalizedQuery,
                        statusFilter,
                        onlyUnassigned,
                        pageable);

        List<Letter> letters = letterPage.getContent();
        Map<Long, String> latestActions = getLatestAdminActionMapSafely(
                letters.stream()
                        .map(Letter::getId)
                        .toList());

        Page<AdminLetterListItem> mappedPage = new PageImpl<>(
                letters.stream()
                        .map(letter -> AdminLetterListItem.from(
                                letter,
                                isWritingStatusAvailable(letter.getId()),
                                latestActions.get(letter.getId())))
                        .toList(),
                pageable,
                letterPage.getTotalElements());

        return AdminLetterListRes.from(mappedPage);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminLetterDetailRes getAdminLetter(long id) {
        Letter letter = letterPort.findByIdForAdmin(id)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 편지입니다."));

        List<AdminLetterActionLogItem> actionLogs = getAdminActionLogsSafely(letter.getId());

        return AdminLetterDetailRes.from(
                letter,
                isWritingStatusAvailable(letter.getId()),
                actionLogs);
    }

    @Override
    @Transactional
    public void handleAdminLetter(long id, AdminLetterHandleReq req, long adminMemberId) {
        Letter letter = letterPort.findByIdForAdmin(id)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 편지입니다."));

        AdminLetterActionType action = req.action();
        if (action == null) {
            throw new ServiceException("400-1", "관리자 조치가 필요합니다.");
        }

        String memo = normalizeMemo(req.memo());
        if (action == AdminLetterActionType.NOTE && memo == null) {
            throw new ServiceException("400-1", "운영 메모를 입력해 주세요.");
        }

        switch (action) {
            case NOTE -> {
            }
            case REASSIGN_RECEIVER -> {
                if (isWritingStatusAvailable(letter.getId())) {
                    throw new ServiceException("400-3", "답장을 작성 중인 편지는 재배정할 수 없습니다.");
                }
                List<Long> excludeIds = buildExcludedMemberIds(letter);
                Member newReceiver = letterPort.findRandomMemberExceptMe(excludeIds)
                        .orElseThrow(() -> new ServiceException("404-2", "편지를 전달할 수 있는 다른 유저가 없습니다."));
                letter.adminReassign(newReceiver);
                letterRedisRepository.deleteWritingStatus(letter.getId());
            }
            case BLOCK_SENDER -> {
                Member sender = letter.getSender();
                memberService.blockMemberByAdminAction(
                        sender.getId(),
                        adminMemberId,
                        memo,
                        true);
            }
        }

        letterAdminActionLogRepository.save(
                com.back.letter.domain.LetterAdminActionLog.create(
                        letter,
                        adminMemberId,
                        resolveAdminNickname(adminMemberId),
                        action,
                        memo));
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

    private AuditAiResponse auditContent(String content, String type) {
        var response = aiService.auditContent(new AuditAiRequest(content, type));
        if (!response.isPassed()) throw new ServiceException("400-AI", response.message());
        return response;
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

    private List<Long> buildExcludedMemberIds(Letter letter) {
        Long senderId = letter.getSender().getId();
        Long receiverId = letter.getReceiver() != null ? letter.getReceiver().getId() : null;
        if (receiverId == null) {
            return List.of(senderId);
        }
        return List.of(senderId, receiverId);
    }

    private String resolveAdminNickname(long adminMemberId) {
        return memberRepository.findById(adminMemberId)
                .map(Member::getNickname)
                .orElse("관리자#" + adminMemberId);
    }

    private Map<Long, String> getLatestAdminActionMapSafely(List<Long> letterIds) {
        if (letterIds.isEmpty()) {
            return Map.of();
        }

        try {
            return letterAdminActionLogRepository.findLatestActionsByLetterIds(letterIds)
                    .stream()
                    .collect(Collectors.toMap(
                            LetterAdminActionLogRepository.LatestActionProjection::getLetterId,
                            LetterAdminActionLogRepository.LatestActionProjection::getActionType,
                            (left, right) -> left));
        } catch (DataAccessException exception) {
            log.warn("관리자 편지 최신 조치 목록을 불러오지 못해 기본값으로 대체합니다. letterIds={}", letterIds, exception);
            return Map.of();
        }
    }

    private String getLatestAdminActionSafely(long letterId) {
        try {
            return letterAdminActionLogRepository
                    .findByLetterIdOrderByCreateDateDesc(letterId)
                    .stream()
                    .findFirst()
                    .map(log -> log.getActionType().name())
                    .orElse(null);
        } catch (DataAccessException exception) {
            log.warn("관리자 편지 최신 조치를 불러오지 못해 기본값으로 대체합니다. letterId={}", letterId, exception);
            return null;
        }
    }

    private List<AdminLetterActionLogItem> getAdminActionLogsSafely(long letterId) {
        try {
            return letterAdminActionLogRepository
                    .findByLetterIdOrderByCreateDateDesc(letterId)
                    .stream()
                    .map(AdminLetterActionLogItem::from)
                    .toList();
        } catch (DataAccessException exception) {
            log.warn("관리자 편지 조치 이력을 불러오지 못해 빈 목록으로 대체합니다. letterId={}", letterId, exception);
            return List.of();
        }
    }

    private boolean isWritingStatusAvailable(long letterId) {
        try {
            return letterRedisRepository.isWriting(letterId);
        } catch (DataAccessException exception) {
            log.warn("관리자 편지 작성 중 상태를 불러오지 못해 false로 대체합니다. letterId={}", letterId, exception);
            return false;
        }
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return query.trim();
    }

    private String normalizeMemo(String memo) {
        if (memo == null || memo.isBlank()) {
            return null;
        }
        return memo.trim();
    }

    private LetterStatus resolveStatusFilter(String status, boolean onlyUnassigned) {
        if (onlyUnassigned || status == null || status.isBlank()) {
            return null;
        }

        try {
            return LetterStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ServiceException("400-1", "지원하지 않는 편지 상태입니다.");
        }
    }
}
