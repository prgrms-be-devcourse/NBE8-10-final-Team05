package com.back.member.adapter.in.web.dto;

import com.back.member.domain.MemberAdminActionLog;
import java.time.LocalDateTime;

public record AdminMemberActionLogItem(
    Long logId,
    String action,
    String adminNickname,
    String beforeValue,
    String afterValue,
    String memo,
    LocalDateTime createdAt) {

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
