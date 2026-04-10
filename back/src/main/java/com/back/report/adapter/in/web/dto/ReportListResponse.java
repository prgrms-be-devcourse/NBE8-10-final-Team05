package com.back.report.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 신고 목록 항목")
public record ReportListResponse(
        @Schema(description = "신고 식별자", example = "9001") Long reportId,
        @Schema(description = "신고자 닉네임", example = "마음온데모") String reporterNickname,
        @Schema(description = "신고 대상 유형", example = "POST") String targetType,
        @Schema(description = "신고 대상 식별자", example = "101") Long targetId,
        @Schema(description = "신고 사유", example = "PROFANITY") String reason,
        @Schema(description = "처리 상태", example = "PENDING") String status,
        @Schema(description = "접수 시각", example = "2026-04-10T07:30:00") LocalDateTime createdAt
) {}
