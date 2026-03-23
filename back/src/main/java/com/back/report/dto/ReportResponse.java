package com.back.report.dto;

import com.back.report.entity.Report;
import com.back.report.entity.ReportReason;
import com.back.report.entity.ReportStatus;
import com.back.report.entity.TargetType;

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
