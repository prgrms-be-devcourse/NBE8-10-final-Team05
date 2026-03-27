package com.back.notification.service;

import com.back.member.domain.MemberRepository;
import com.back.notification.entity.Notification;
import com.back.notification.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    // 사용자 ID별 연결 관리 (스레드 안전)
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private static final Long DEFAULT_TIMEOUT = 60L * 1000 * 60; // 1시간
    private final NotificationRepository notificationRepository; // 추가
    private final MemberRepository memberRepository;

    /** 클라이언트 구독 */
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));

        // 503 에러 방지를 위한 첫 연결 더미 데이터
        sendToClient(userId, "connect", "connected!");

        return emitter;
    }

    @Transactional // DB 저장을 위해 추가
    public void send(Long userId, String eventName, String content) {
        // 1. DB에 알림 저장 (오프라인 유저도 나중에 볼 수 있게)
        memberRepository.findById(userId).ifPresent(receiver -> {
            Notification notification = Notification.builder()
                    .receiver(receiver)
                    .content(content)
                    .build();
            notificationRepository.save(notification);
        });

        sendToClient(userId, eventName, content);
    }

    private void sendToClient(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (IOException e) {
                emitters.remove(userId);
                log.error("SSE 전송 실패: {}", userId);
            }
        }
    }
}