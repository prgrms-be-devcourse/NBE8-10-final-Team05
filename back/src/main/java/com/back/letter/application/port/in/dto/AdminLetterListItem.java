package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import java.time.LocalDateTime;

public record AdminLetterListItem(
    long letterId,
    String title,
    String senderNickname,
    String receiverNickname,
    String latestAction,
    String status,
    LocalDateTime createdAt,
    LocalDateTime replyCreatedAt) {

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
