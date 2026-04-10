package com.back.report.adapter.in.web.dto;

import com.back.report.domain.ReportReason;
import com.back.report.domain.TargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "신고 접수 요청")
public record ReportCreateRequest(
        @NotNull @Schema(description = "신고 대상 식별자", example = "101") Long targetId,
        @NotNull @Schema(description = "신고 대상 유형", implementation = TargetType.class, example = "POST") TargetType targetType,
        @NotNull @Schema(description = "신고 사유", implementation = ReportReason.class, example = "PROFANITY") ReportReason reason,
        @Schema(description = "상세 신고 내용", example = "지속적인 욕설과 비방 표현이 포함되어 있습니다.") String content
) {}
