package com.back.report.dto;

public record ReportHandleRequest(
        String action,
        String adminComment,
        boolean isNotify,
        String notificationMessage
) {}
