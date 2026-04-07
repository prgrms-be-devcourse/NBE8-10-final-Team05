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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConsultationSseAdapter implements ConsultationSsePort {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final RedisTemplate<String, Object> redisTemplate;
    private final String serverId = UUID.randomUUID().toString();
    private static final String SESSION_KEY = "sse:sessions:consultation";
    private static final String CHANNEL_NAME = "sse-topic";
    private static final Long TIMEOUT = 60L * 1000 * 30;

    @Override
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emitters.put(userId, emitter);
        // Redis 전역 레지스트리에 유저 접속 정보 기록
        redisTemplate.opsForHash().put(SESSION_KEY, userId.toString(), serverId);
        emitter.onCompletion(() -> removeSession(userId));
        emitter.onTimeout(() -> {
            emitter.complete();
            removeSession(userId);
        });
        emitter.onError((e) -> removeSession(userId));
        sendToLocal(userId, "connect", "connected");
        return emitter;
    }

    private void removeSession(Long userId) {
        emitters.remove(userId);
        redisTemplate.opsForHash().delete(SESSION_KEY, userId.toString());
        log.info("상담 세션 종료 및 Redis 주소록 제거 - 유저: {}", userId);
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
                removeSession(userId);
            }
        }
    }
}
