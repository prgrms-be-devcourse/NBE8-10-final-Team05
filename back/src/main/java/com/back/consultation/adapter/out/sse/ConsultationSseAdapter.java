package com.back.consultation.adapter.out.sse;

import com.back.consultation.application.port.out.ConsultationSsePort;
import com.back.global.redis.RedisSseMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConsultationSseAdapter implements ConsultationSsePort {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String CHANNEL_NAME = "sse-topic";
    private static final Long TIMEOUT = 60L * 1000 * 30;

    @Override
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emitters.put(userId, emitter);
        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        sendToLocal(userId, "connect", "connected");
        return emitter;
    }

    @Override
    public void sendStreaming(Long userId, String content) {
        RedisSseMessage message = new RedisSseMessage("CONSULTATION", userId, "chat", content);
        redisTemplate.convertAndSend(CHANNEL_NAME, message);
    }

    @Override
    public void sendCompleted(Long userId) {
        RedisSseMessage message = new RedisSseMessage("CONSULTATION", userId, "chat_done", "done");
        redisTemplate.convertAndSend(CHANNEL_NAME, message);
    }

    @Override
    public void sendError(Long userId, String message) {
        RedisSseMessage payload = new RedisSseMessage("CONSULTATION", userId, "chat_error", message);
        redisTemplate.convertAndSend(CHANNEL_NAME, payload);
    }

     // 상담 유저에게 SSE 전송
    public void sendToLocal(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException e) {
                log.error("상담 스트리밍 전송 중 오류 발생 - 사용자ID: {}, 에러: {}", userId, e.getMessage());
                emitters.remove(userId);
            }
        }
    }
}
