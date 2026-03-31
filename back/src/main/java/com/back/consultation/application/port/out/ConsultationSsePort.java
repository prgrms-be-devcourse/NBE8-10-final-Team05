package com.back.consultation.application.port.out;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface ConsultationSsePort {
    SseEmitter subscribe(Long userId);
    void sendStreaming(Long userId, String content); // 글자 단위 전송
}