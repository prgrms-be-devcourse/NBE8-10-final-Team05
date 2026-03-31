package com.back.ai.adapter.in.web.dto;

public record AuditAiResponse(
        boolean isPassed,
        String violationType, // PROFANITY(욕설), PERSONAL_INFO(개인정보), INSINCERE(무성의), NONE
        String message
) {}
