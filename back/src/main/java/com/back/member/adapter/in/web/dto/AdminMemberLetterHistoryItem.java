package com.back.member.adapter.in.web.dto;

import com.back.letter.domain.Letter;
import com.back.member.domain.Member;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 회원 상세 화면의 최근 편지 이력")
public record AdminMemberLetterHistoryItem(
    @Schema(description = "편지 식별자", example = "55") Long letterId,
    @Schema(description = "편지 제목", example = "오늘 너무 지쳐요") String title,
    @Schema(description = "편지 방향", example = "SENT") String direction,
    @Schema(description = "상대 닉네임", example = "다정한고래") String counterpartyNickname,
    @Schema(description = "편지 상태", example = "REPLIED") String status,
    @Schema(description = "생성 시각", example = "2026-04-09T23:10:00") LocalDateTime createdAt) {

  public static AdminMemberLetterHistoryItem from(Letter letter, Long memberId) {
    boolean isSender = letter.getSender() != null && letter.getSender().getId().equals(memberId);
    Member counterparty = isSender ? letter.getReceiver() : letter.getSender();

    return new AdminMemberLetterHistoryItem(
        letter.getId(),
        letter.getTitle(),
        isSender ? "SENT" : "RECEIVED",
        counterparty == null ? "미배정" : counterparty.getNickname(),
        letter.getStatus() == null ? "UNASSIGNED" : letter.getStatus().name(),
        letter.getCreateDate());
  }
}
