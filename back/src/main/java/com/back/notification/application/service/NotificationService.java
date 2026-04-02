package com.back.notification.application.service;

import com.back.letter.application.port.in.dto.LetterStatusUpdatePayload;
import com.back.member.domain.MemberRepository;
import com.back.notification.application.port.out.NotificationSsePort;
import com.back.notification.domain.Notification;
import com.back.notification.domain.NotificationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationSsePort notificationSsePort;
    private final NotificationRepository notificationRepository;
    private final MemberRepository memberRepository;

    public SseEmitter subscribe(Long userId) {
        return notificationSsePort.subscribe(userId);
    }

    @Transactional // DB 저장을 위해 추가
    public void send(Long userId, String eventName, Object content) {
        String stringContent = extractContent(content);
        // 1. DB에 알림 저장 (오프라인 유저도 나중에 볼 수 있게)
        memberRepository.findById(userId).ifPresent(receiver -> {
            Notification notification = Notification.builder()
                    .receiver(receiver)
                    .content(stringContent)
                    .build();
            notificationRepository.save(notification);
        });

        notificationSsePort.sendToClient(userId, eventName, content);
    }


    private String extractContent(Object data) {
        if (data instanceof String s) {
            return s;
        } else if (data instanceof LetterStatusUpdatePayload payload) {
            return payload.message();
        }
        return data.toString();
    }
}
