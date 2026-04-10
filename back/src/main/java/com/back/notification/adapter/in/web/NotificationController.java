package com.back.notification.adapter.in.web;

import com.back.auth.application.AuthErrorCode;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.notification.adapter.in.web.docs.NotificationApiDocs;
import com.back.notification.adapter.in.web.dto.NotificationSubscriptionTicketResponse;
import com.back.notification.application.service.NotificationService;
import com.back.notification.domain.Notification;
import com.back.notification.domain.NotificationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
public class NotificationController implements NotificationApiDocs {
  private final NotificationService notificationService;
  private final NotificationRepository notificationRepository;

  @PostMapping("/subscribe-ticket")
  public RsData<NotificationSubscriptionTicketResponse> issueSubscribeTicket(
      @AuthenticationPrincipal AuthenticatedMember authMember) {
    String ticket = notificationService.issueSubscriptionTicket(requiredMemberId(authMember));
    NotificationSubscriptionTicketResponse response =
        new NotificationSubscriptionTicketResponse(
            ticket, notificationService.subscriptionTicketTtlSeconds());
    return new RsData<>("200-2", "알림 SSE 구독 티켓 발급 성공", response);
  }

  @GetMapping(value = "/subscribe", produces = "text/event-stream")
  public SseEmitter subscribe(@RequestParam("ticket") String ticket) {
    return notificationService.subscribe(ticket);
  }

  @GetMapping
  public RsData<List<Notification>> getNotifications(
      @AuthenticationPrincipal AuthenticatedMember authMember) {
    List<Notification> notifications =
        notificationRepository.findByReceiverIdOrderByCreateDateDesc(
            requiredMemberId(authMember));
    return new RsData<>("200-1", "알림 목록 조회 성공", notifications);
  }

  private Long requiredMemberId(AuthenticatedMember authMember) {
    if (authMember == null || authMember.memberId() == null) {
      throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
    }
    return authMember.memberId();
  }
}
