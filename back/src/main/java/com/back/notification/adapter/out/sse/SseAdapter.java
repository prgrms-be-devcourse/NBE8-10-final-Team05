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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class SseAdapter implements NotificationSsePort {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String CHANNEL_NAME = "sse-topic";
    private final String serverId = UUID.randomUUID().toString();
    private static final String SESSION_KEY = "sse:sessions:notification";
    // 타임아웃을 너무 길게 잡으면 좀비 커넥션이 늘어날 수 있습니다 (보통 30분~1시간 권장)
    private static final Long DEFAULT_TIMEOUT = 30L * 60 * 1000;


    @Override
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

        emitters.put(userId, emitter);
        redisTemplate.opsForHash().put(SESSION_KEY, userId.toString(), serverId);

        // 초기화 시 콜백 등록 (매우 중요)
        emitter.onCompletion(() -> {
            log.info("SSE 연결 종료 - 사용자ID: {}", userId);
            removeSession(userId);
        });
        emitter.onTimeout(() -> {
            log.info("SSE 타임아웃 - 사용자ID: {}", userId);
            emitter.complete(); // 완료 처리하여 안전하게 닫음
            removeSession(userId);
        });
        emitter.onError((e) -> {
            log.error("SSE 에러 발생 - 사용자ID: {}, 에러: {}", userId, e.getMessage());
            removeSession(userId);
        });

        // 503 에러 방지를 위한 첫 연결 더미 데이터 전송
        // 직접 send를 호출하기보다 공통 메서드를 활용하는 것이 안전합니다.
        sendToLocal(userId, "connect", "연결되었습니다!");

        return emitter;
    }

    private void removeSession(Long userId) {
        emitters.remove(userId);
        redisTemplate.opsForHash().delete(SESSION_KEY, userId.toString());
    }

    @Override
    public void sendToClient(Long userId, String eventName, Object data) {
        RedisSseMessage message = new RedisSseMessage("NOTIFICATION", userId, eventName, data);
        redisTemplate.convertAndSend(CHANNEL_NAME, message);
    }

    public void sendToLocal(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .id(String.valueOf(System.currentTimeMillis())) // ID를 추가하면 재연결 시 이점이 있음
                        .name(eventName)
                        .data(data));
            } catch (Exception e) { // IOException 외에도 IllegalStateException 등 포괄적 처리
                log.warn("알림 전송 실패(사용자 연결 끊김 추정) - 사용자ID: {}", userId);
                emitter.completeWithError(e); // 에러 상태로 종료 처리
                removeSession(userId);
            }
        }
    }
}
