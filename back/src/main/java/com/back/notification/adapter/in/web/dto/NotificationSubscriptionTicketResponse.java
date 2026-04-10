package com.back.notification.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 SSE 구독 티켓 응답")
public record NotificationSubscriptionTicketResponse(
    @Schema(description = "SSE 연결에 사용할 일회성 티켓", example = "d9c3e7d7-1bfc-4b7d-9174-95dc32119f40")
        String ticket,
    @Schema(description = "티켓 만료까지 남은 초", example = "300") long expiresInSeconds) {}
