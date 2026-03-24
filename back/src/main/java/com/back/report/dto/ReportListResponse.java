package com.back.report.dto;

import com.back.report.entity.TargetType;
import java.time.LocalDateTime;

public record ReportListResponse(
        Long reportId,
        String reporterNickname,
        String targetType,
        Long targetId,
        String reason,
        String status,
        LocalDateTime createdAt
) {}
