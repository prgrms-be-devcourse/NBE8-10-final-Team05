package com.back.consultation.adapter.in.web.dto;

import java.time.LocalDateTime;

public record ConsultationResponse(
    Long consultationId,
    Long memberId,
    LocalDateTime createdAt
) {}