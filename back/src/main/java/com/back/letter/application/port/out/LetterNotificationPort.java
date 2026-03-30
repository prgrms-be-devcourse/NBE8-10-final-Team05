package com.back.letter.application.port.out;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface LetterNotificationPort {
    // 사용자가 SSE 연결을 시작
    SseEmitter subscribe(Long memberId);
    
    // 특정 사용자에게 실시간 알림
    void sendNotification(Long receiverId, String eventName, Object data);
}
