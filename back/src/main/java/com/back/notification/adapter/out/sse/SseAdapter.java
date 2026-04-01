package com.back.notification.adapter.out.sse;

import com.back.global.redis.RedisSseMessage;
import com.back.notification.application.port.out.NotificationSsePort;
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
public class SseAdapter implements NotificationSsePort {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String CHANNEL_NAME = "sse-topic";
    private static final Long DEFAULT_TIMEOUT = 60L * 1000 * 60;

    @Override
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));

        // 503 에러 방지를 위한 첫 연결 더미 데이터
        sendToLocal(userId, "connect", "연결되었습니다!");

        return emitter;
    }

    @Override
    public void sendToClient(Long userId, String eventName, Object data) {
        // Redis 채널에 메시지 발행
        RedisSseMessage message = new RedisSseMessage("NOTIFICATION", userId, eventName, data);
        redisTemplate.convertAndSend(CHANNEL_NAME, message);
    }

    // 클라이언트에게 SSE 전송
    public void sendToLocal(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (IOException e) {
                log.error("알림 SSE 전송 중 오류 발생 - 사용자ID: {}, 에러: {}", userId, e.getMessage());
                emitters.remove(userId);
            }
        }
    }
}
