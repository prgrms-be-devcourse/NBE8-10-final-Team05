package com.back.member.adapter.in.web.dto;

import com.back.letter.domain.Letter;
import com.back.member.domain.Member;
import java.time.LocalDateTime;

public record AdminMemberLetterHistoryItem(
    Long letterId,
    String title,
    String direction,
    String counterpartyNickname,
    String status,
    LocalDateTime createdAt) {

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
