package com.back.global.event;

/**
 * 편지 관련 알림 발생 시 던질 이벤트 객체
 */
public record LetterNotificationEvent(
    Long receiverId,
    String eventName,
    String content
) {}
