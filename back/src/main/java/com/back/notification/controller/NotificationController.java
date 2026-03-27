package com.back.notification.controller;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.notification.entity.Notification;
import com.back.notification.repository.NotificationRepository;
import com.back.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    @GetMapping(value = "/subscribe", produces = "text/event-stream")
    public SseEmitter subscribe(@AuthenticationPrincipal AuthenticatedMember authMember) {
        return notificationService.subscribe(authMember.memberId());
    }

    @GetMapping
    public RsData<List<Notification>> getNotifications(@AuthenticationPrincipal AuthenticatedMember authMember) {
        // Repository에서 현재 로그인한 유저의 알림을 최신순으로 가져옵니다.
        List<Notification> notifications = notificationRepository
                .findByReceiverIdOrderByCreateDateDesc(authMember.memberId());

        return new RsData<>("200-1", "알림 목록 조회 성공", notifications);
    }
}