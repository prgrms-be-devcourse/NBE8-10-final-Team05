package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 편지 목록 항목")
public record AdminLetterListItem(
    @Schema(description = "편지 식별자", example = "55") long letterId,
    @Schema(description = "편지 제목", example = "오늘 너무 지쳐요") String title,
    @Schema(description = "발신자 닉네임", example = "마음온데모") String senderNickname,
    @Schema(description = "수신자 닉네임", example = "다정한고래") String receiverNickname,
    @Schema(description = "가장 최근 운영 액션", example = "NOTE") String latestAction,
    @Schema(description = "현재 편지 상태", example = "WRITING") String status,
    @Schema(description = "편지 생성 시각", example = "2026-04-10T08:40:00") LocalDateTime createdAt,
    @Schema(description = "답장 생성 시각", example = "2026-04-10T09:15:00") LocalDateTime replyCreatedAt) {

  public static AdminLetterListItem from(Letter letter, boolean isWriting, String latestAction) {
    return new AdminLetterListItem(
        letter.getId(),
        letter.getTitle(),
        getNickname(letter.getSender()),
        getNickname(letter.getReceiver()),
        latestAction,
        resolveStatus(letter, isWriting),
        letter.getCreateDate(),
        letter.getReplyCreatedDate());
  }

  private static String getNickname(Member member) {
    return member != null ? member.getNickname() : null;
  }

  private static String resolveStatus(Letter letter, boolean isWriting) {
    if (isWriting) {
      return LetterStatus.WRITING.name();
    }

    return letter.getStatus() != null ? letter.getStatus().name() : "UNASSIGNED";
  }
}
