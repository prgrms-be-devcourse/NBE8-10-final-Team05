package com.back.notification.application.port.out;

import java.time.Duration;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** 알림 전송 및 구독을 위한 출력 포트. */
public interface NotificationSsePort {
  SseEmitter subscribe(Long userId);

  String issueSubscriptionTicket(Long userId, Duration ttl);

  Long resolveUserIdBySubscriptionTicket(String ticket);

  void sendToClient(Long userId, String eventName, Object data);
}
