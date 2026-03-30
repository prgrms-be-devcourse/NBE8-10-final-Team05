package com.back.report.adapter.in.web.dto;

public record ReportHandleRequest(
        String action,
        String adminComment,
        Boolean isNotify,
        String notificationMessage
) {}
