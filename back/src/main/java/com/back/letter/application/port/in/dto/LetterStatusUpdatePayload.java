package com.back.letter.application.port.in.dto;

// 알림 시 전송할 페이로드 (DTO)
public record LetterStatusUpdatePayload(
    Long letterId,
    String status,   // "ACCEPTED", "WRITING", "REPLIED" 등
    String message   // 사용자에게 노출할 알림 문구
) {}
