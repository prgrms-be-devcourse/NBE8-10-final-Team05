package com.back.letter.application.port.in.dto;

import com.back.letter.domain.LetterAdminActionLog;
import java.time.LocalDateTime;

public record AdminLetterActionLogItem(
    long logId,
    String action,
    String adminNickname,
    String memo,
    LocalDateTime createdAt) {

  public static AdminLetterActionLogItem from(LetterAdminActionLog log) {
    return new AdminLetterActionLogItem(
        log.getId(),
        log.getActionType().name(),
        log.getAdminNickname(),
        log.getMemo(),
        log.getCreateDate());
  }
}
