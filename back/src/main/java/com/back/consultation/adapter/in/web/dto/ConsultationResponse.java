package com.back.consultation.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "상담 세션 생성 응답")
public record ConsultationResponse(
    @Schema(description = "상담 식별자", example = "701") Long consultationId,
    @Schema(description = "회원 식별자", example = "17") Long memberId,
    @Schema(description = "상담 시작 시각", example = "2026-04-10T11:00:00") LocalDateTime createdAt
) {}
