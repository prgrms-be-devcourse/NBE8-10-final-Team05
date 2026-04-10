package com.back.member.adapter.in.web.dto;

import com.back.report.domain.Report;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 회원 상세 화면의 신고 이력")
public record AdminMemberReportHistoryItem(
    @Schema(description = "신고 식별자", example = "9001") Long reportId,
    @Schema(description = "회원과 신고의 관계", example = "SUBMITTED") String relation,
    @Schema(description = "신고 대상 유형", example = "POST") String targetType,
    @Schema(description = "신고 대상 식별자", example = "101") Long targetId,
    @Schema(description = "신고 사유", example = "PROFANITY") String reason,
    @Schema(description = "신고 처리 상태", example = "PENDING") String status,
    @Schema(description = "운영 처리 액션", example = "DELETE") String processingAction,
    @Schema(description = "신고 접수 시각", example = "2026-04-10T07:30:00") LocalDateTime createdAt) {

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
