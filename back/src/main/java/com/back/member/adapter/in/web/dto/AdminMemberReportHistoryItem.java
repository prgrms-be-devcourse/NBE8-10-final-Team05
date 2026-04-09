package com.back.member.adapter.in.web.dto;

import com.back.report.domain.Report;
import java.time.LocalDateTime;

public record AdminMemberReportHistoryItem(
    Long reportId,
    String relation,
    String targetType,
    Long targetId,
    String reason,
    String status,
    String processingAction,
    LocalDateTime createdAt) {

  public static AdminMemberReportHistoryItem submitted(Report report) {
    return new AdminMemberReportHistoryItem(
        report.getId(),
        "SUBMITTED",
        report.getTargetType().name(),
        report.getTargetId(),
        report.getReason().name(),
        report.getStatus().name(),
        report.getProcessingAction(),
        report.getCreateDate());
  }

  public static AdminMemberReportHistoryItem received(Report report) {
    return new AdminMemberReportHistoryItem(
        report.getId(),
        "RECEIVED",
        report.getTargetType().name(),
        report.getTargetId(),
        report.getReason().name(),
        report.getStatus().name(),
        report.getProcessingAction(),
        report.getCreateDate());
  }
}
