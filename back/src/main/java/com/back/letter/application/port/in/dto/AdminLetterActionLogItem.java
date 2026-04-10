package com.back.letter.application.port.in.dto;

import com.back.letter.domain.LetterAdminActionLog;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 편지 조치 로그")
public record AdminLetterActionLogItem(
    @Schema(description = "로그 식별자", example = "501") long logId,
    @Schema(description = "조치 유형", example = "BLOCK_SENDER") String action,
    @Schema(description = "운영자 닉네임", example = "운영자A") String adminNickname,
    @Schema(description = "조치 메모", example = "반복 악성 편지 전송으로 발신자를 차단했습니다.") String memo,
    @Schema(description = "조치 시각", example = "2026-04-10T10:10:00") LocalDateTime createdAt) {

  public static AdminLetterActionLogItem from(LetterAdminActionLog log) {
    return new AdminLetterActionLogItem(
        log.getId(),
        log.getActionType().name(),
        log.getAdminNickname(),
        log.getMemo(),
        log.getCreateDate());
  }
}
