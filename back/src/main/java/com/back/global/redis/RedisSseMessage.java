package com.back.global.redis;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RedisSseMessage(
    String type,      // "NOTIFICATION" 또는 "CONSULTATION"
    Long userId,
    String eventName, // SSE 이벤트 명 ( "chat", "new_letter")
    Object data       // 전송할 실제 데이터
) {}