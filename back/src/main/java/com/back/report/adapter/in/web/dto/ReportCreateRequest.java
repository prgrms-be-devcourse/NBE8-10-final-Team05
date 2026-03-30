package com.back.report.adapter.in.web.dto;

import com.back.report.domain.ReportReason;
import com.back.report.domain.TargetType;
import jakarta.validation.constraints.NotNull;

public record ReportCreateRequest(
        @NotNull Long targetId,
        @NotNull TargetType targetType,
        @NotNull ReportReason reason,
        String content
) {}