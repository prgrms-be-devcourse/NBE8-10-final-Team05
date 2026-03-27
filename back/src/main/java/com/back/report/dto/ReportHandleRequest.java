package com.back.report.dto;

public record ReportHandleRequest(
        String action,
        String adminComment,
        Boolean isNotify,
        String notificationMessage
) {}
