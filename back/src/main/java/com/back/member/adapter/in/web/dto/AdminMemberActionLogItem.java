package com.back.member.adapter.in.web.dto;

import com.back.member.domain.MemberAdminActionLog;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 회원 조치 로그")
public record AdminMemberActionLogItem(
    @Schema(description = "로그 식별자", example = "301") Long logId,
    @Schema(description = "수행한 조치 유형", example = "UPDATE_STATUS") String action,
    @Schema(description = "조치를 수행한 운영자 닉네임", example = "운영자A") String adminNickname,
    @Schema(description = "변경 전 값", example = "ACTIVE") String beforeValue,
    @Schema(description = "변경 후 값", example = "BLOCKED") String afterValue,
    @Schema(description = "운영 메모", example = "욕설 신고 누적 3회") String memo,
    @Schema(description = "조치 시각", example = "2026-04-10T12:00:00") LocalDateTime createdAt) {

  public static AdminMemberActionLogItem from(MemberAdminActionLog log) {
    return new AdminMemberActionLogItem(
        log.getId(),
        log.getActionType().name(),
        log.getAdminNickname(),
        log.getBeforeValue(),
        log.getAfterValue(),
        log.getMemo(),
        log.getCreateDate());
  }
}
