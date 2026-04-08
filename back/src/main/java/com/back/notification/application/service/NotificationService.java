package com.back.notification.application.service;

import com.back.auth.application.AuthErrorCode;
import com.back.letter.application.port.in.dto.LetterStatusUpdatePayload;
import com.back.member.domain.MemberRepository;
import com.back.notification.application.port.out.NotificationSsePort;
import com.back.notification.domain.Notification;
import com.back.notification.domain.NotificationRepository;
import java.time.Duration;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@RequiredArgsConstructor
public class NotificationService {
  private static final Duration SUBSCRIPTION_TICKET_TTL = Duration.ofMinutes(1);

  private final NotificationSsePort notificationSsePort;
  private final NotificationRepository notificationRepository;
  private final MemberRepository memberRepository;

  public SseEmitter subscribe(String ticket) {
    Long userId = notificationSsePort.resolveUserIdBySubscriptionTicket(ticket);
    if (userId == null) {
      throw AuthErrorCode.SSE_SUBSCRIPTION_TICKET_INVALID.toException();
    }
    return notificationSsePort.subscribe(userId);
  }

  public String issueSubscriptionTicket(Long userId) {
    return notificationSsePort.issueSubscriptionTicket(userId, SUBSCRIPTION_TICKET_TTL);
  }

  public long subscriptionTicketTtlSeconds() {
    return SUBSCRIPTION_TICKET_TTL.toSeconds();
  }

  @Transactional
  public void send(Long userId, String eventName, Object content) {
    String stringContent = extractContent(content);
    memberRepository
        .findById(userId)
        .ifPresent(
            receiver -> {
              Notification notification =
                  Notification.builder().receiver(receiver).content(stringContent).build();
              notificationRepository.save(notification);
            });

    notificationSsePort.sendToClient(userId, eventName, content);
  }

  private String extractContent(Object data) {
    if (data instanceof String s) {
      return s;
    }
    if (data instanceof LetterStatusUpdatePayload payload) {
      return payload.message();
    }
    return data.toString();
  }
}
