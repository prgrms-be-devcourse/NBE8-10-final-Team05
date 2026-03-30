package com.back.report.adapter.in.web.dto;

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
