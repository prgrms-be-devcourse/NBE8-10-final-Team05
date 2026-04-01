package com.back.consultation.adapter.out.sse;

import com.back.consultation.application.port.out.ConsultationSsePort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class ConsultationSseAdapter implements ConsultationSsePort {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private static final Long TIMEOUT = 60L * 1000 * 30; // 30분 유지

    @Override
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emitters.put(userId, emitter);
        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        return emitter;
    }

    @Override
    public void sendStreaming(Long userId, String content) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                // 'chat' 이벤트로 한 글자씩 전송
                emitter.send(SseEmitter.event().name("chat").data(content));
            } catch (IOException e) {
                emitters.remove(userId);
            }
        }
    }
}