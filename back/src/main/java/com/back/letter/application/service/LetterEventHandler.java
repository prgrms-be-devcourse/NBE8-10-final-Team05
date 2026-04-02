package com.back.letter.application.service;

import com.back.global.event.LetterEvents;
import com.back.letter.application.port.in.dto.LetterStatusUpdatePayload;
import com.back.notification.application.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class LetterEventHandler {

    private final NotificationService notificationService;
    private final CacheManager cacheManager;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLetterSent(LetterEvents.LetterSentEvent event) {
        // 캐시 무효화
        evictCache(event.receiverId());

        notificationService.send(
                event.receiverId(),
                "new_letter",
                new LetterStatusUpdatePayload(event.letterId(), "SENT", "새로운 랜덤 편지가 도착했습니다!")
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLetterReplied(LetterEvents.LetterRepliedEvent event) {
        evictCache(event.senderId());
        evictCache(event.receiverId());

        notificationService.send(
                event.senderId(),
                "reply_arrival",
                new LetterStatusUpdatePayload(event.letterId(), "REPLIED", "보낸 편지에 답장이 도착했습니다!")
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLetterAccepted(LetterEvents.LetterAcceptedEvent event) {
        evictCache(event.senderId());

        notificationService.send(
                event.senderId(),
                "letter_read",
                new LetterStatusUpdatePayload(event.letterId(), "ACCEPTED", "상대방이 편지를 읽었습니다.")
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLetterWriting(LetterEvents.LetterWritingEvent event) {
        notificationService.send(
                event.receiverId(),
                "writing_status",
                new LetterStatusUpdatePayload(event.letterId(), "WRITING", "상대방이 답장을 작성 중입니다.")
        );
    }

    private void evictCache(Long memberId) {
        Cache cache = cacheManager.getCache("mailboxStats");
        if (cache != null) {
            cache.evict(memberId);
        }
    }
}
