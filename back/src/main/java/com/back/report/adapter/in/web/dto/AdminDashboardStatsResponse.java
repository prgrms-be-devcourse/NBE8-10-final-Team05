package com.back.report.adapter.in.web.dto;

public record AdminDashboardStatsResponse(
        long todayReportsCount,
        long pendingReportsCount,
        long processedReportsCount,
        long todayLettersCount,
        long todayDiariesCount,
        long availableReceiversCount
) {}
