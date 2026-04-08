package com.back.notification.adapter.out.sse;

import com.back.global.redis.RedisSseMessage;
import com.back.notification.application.port.out.NotificationSsePort;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Component
@RequiredArgsConstructor
public class SseAdapter implements NotificationSsePort {
  private static final String CHANNEL_NAME = "sse-topic";
  private static final String SESSION_KEY = "sse:sessions:notification";
  private static final String SUBSCRIPTION_TICKET_KEY_PREFIX = "sse:ticket:notification:";
  private static final Long DEFAULT_TIMEOUT = 30L * 60 * 1000;

  private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
  private final RedisTemplate<String, Object> redisTemplate;
  private final String serverId = UUID.randomUUID().toString();

  @Override
  public SseEmitter subscribe(Long userId) {
    SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

    emitters.put(userId, emitter);
    redisTemplate.opsForHash().put(SESSION_KEY, userId.toString(), serverId);

    emitter.onCompletion(
        () -> {
          log.info("SSE 연결 종료 - 사용자ID: {}", userId);
          removeSession(userId);
        });
    emitter.onTimeout(
        () -> {
          log.info("SSE 타임아웃 - 사용자ID: {}", userId);
          emitter.complete();
          removeSession(userId);
        });
    emitter.onError(
        error -> {
          log.error("SSE 에러 발생 - 사용자ID: {}, 에러: {}", userId, error.getMessage());
          removeSession(userId);
        });

    sendToLocal(userId, "connect", "연결되었습니다!");

    return emitter;
  }

  @Override
  public String issueSubscriptionTicket(Long userId, Duration ttl) {
    String ticket = UUID.randomUUID().toString();
    redisTemplate.opsForValue().set(buildSubscriptionTicketKey(ticket), userId.toString(), ttl);
    return ticket;
  }

  @Override
  public Long resolveUserIdBySubscriptionTicket(String ticket) {
    if (ticket == null || ticket.isBlank()) {
      return null;
    }
    Object rawUserId = redisTemplate.opsForValue().get(buildSubscriptionTicketKey(ticket));
    if (rawUserId == null) {
      return null;
    }
    try {
      return Long.valueOf(rawUserId.toString());
    } catch (NumberFormatException exception) {
      log.warn("알림 SSE 티켓 사용자ID 파싱 실패 - ticket: {}", ticket);
      return null;
    }
  }

  @Override
  public void sendToClient(Long userId, String eventName, Object data) {
    RedisSseMessage message = new RedisSseMessage("NOTIFICATION", userId, eventName, data);
    redisTemplate.convertAndSend(CHANNEL_NAME, message);
  }

  public void sendToLocal(Long userId, String eventName, Object data) {
    SseEmitter emitter = emitters.get(userId);
    if (emitter == null) {
      return;
    }

    try {
      emitter.send(
          SseEmitter.event()
              .id(String.valueOf(System.currentTimeMillis()))
              .name(eventName)
              .data(data));
    } catch (Exception exception) {
      log.warn("알림 전송 실패(사용자 연결 끊김 추정) - 사용자ID: {}", userId);
      emitter.completeWithError(exception);
      removeSession(userId);
    }
  }

  private void removeSession(Long userId) {
    emitters.remove(userId);
    redisTemplate.opsForHash().delete(SESSION_KEY, userId.toString());
  }

  private String buildSubscriptionTicketKey(String ticket) {
    return SUBSCRIPTION_TICKET_KEY_PREFIX + ticket;
  }
}
