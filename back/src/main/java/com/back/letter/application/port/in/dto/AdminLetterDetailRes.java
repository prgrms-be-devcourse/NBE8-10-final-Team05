package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import java.time.LocalDateTime;
import java.util.List;

public record AdminLetterDetailRes(
    long letterId,
    String title,
    String content,
    String summary,
    String replyContent,
    String replySummary,
    String status,
    LocalDateTime createdAt,
    LocalDateTime replyCreatedAt,
    AdminLetterMemberSummary sender,
    AdminLetterMemberSummary receiver,
    List<AdminLetterActionLogItem> actionLogs) {

  public static AdminLetterDetailRes from(
      Letter letter, boolean isWriting, List<AdminLetterActionLogItem> actionLogs) {
    return new AdminLetterDetailRes(
        letter.getId(),
        letter.getTitle(),
        letter.getContent(),
        letter.getSummary(),
        letter.getReplyContent(),
        letter.getReplySummary(),
        resolveStatus(letter, isWriting),
        letter.getCreateDate(),
        letter.getReplyCreatedDate(),
        AdminLetterMemberSummary.from(letter.getSender()),
        AdminLetterMemberSummary.from(letter.getReceiver()),
        actionLogs);
  }

  private static String resolveStatus(Letter letter, boolean isWriting) {
    if (isWriting) {
      return LetterStatus.WRITING.name();
    }

    return letter.getStatus() != null ? letter.getStatus().name() : "UNASSIGNED";
  }

  public record AdminLetterMemberSummary(
      Long memberId, String nickname, String status, boolean randomReceiveAllowed) {
    public static AdminLetterMemberSummary from(Member member) {
      if (member == null) {
        return null;
      }

      return new AdminLetterMemberSummary(
          member.getId(),
          member.getNickname(),
          member.getStatus().name(),
          member.isRandomReceiveAllowed());
    }
  }
}
