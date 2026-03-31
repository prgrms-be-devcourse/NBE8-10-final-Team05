package com.back.report.adapter.in.web.dto;

import java.time.LocalDateTime;

public record ReportDetailResponse(
        Long reportId,
        String reporterNickname,
        String reason,
        String description,
        String status,
        String processingAction,
        LocalDateTime createdAt,
        TargetInfo targetInfo
) {
    public record TargetInfo(
            String targetType,
            Long targetId,
            String originalContent,
            String authorNickname
    ) {}
}
