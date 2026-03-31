package com.back.report.dto;

import com.back.report.entity.ReportReason;
import com.back.report.entity.TargetType;
import jakarta.validation.constraints.NotNull;

public record ReportCreateRequest(
        @NotNull Long targetId,
        @NotNull TargetType targetType,
        @NotNull ReportReason reason,
        String content
) {}