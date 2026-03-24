package com.back.report.dto;

import com.back.report.entity.TargetType;
import java.time.LocalDateTime;

public record ReportDetailResponse(
        Long reportId,
        String reporterNickname,
        String reason,
        String description,
        String status,
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
