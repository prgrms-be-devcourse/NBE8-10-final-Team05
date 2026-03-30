package com.back.report.adapter.in.web.dto;

import com.back.report.domain.Report;
import com.back.report.domain.ReportReason;
import com.back.report.domain.ReportStatus;
import com.back.report.domain.TargetType;

public record ReportResponse(
        Long id,
        Long reporterId,
        Long targetId,
        TargetType targetType,
        ReportReason reason,
        String content,
        ReportStatus status
) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(
                report.getId(),
                report.getReporterId(),
                report.getTargetId(),
                report.getTargetType(),
                report.getReason(),
                report.getContent(),
                report.getStatus()
        );
    }
}
