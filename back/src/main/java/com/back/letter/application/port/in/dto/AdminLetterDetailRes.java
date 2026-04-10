package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "운영자 편지 상세 응답")
public record AdminLetterDetailRes(
    @Schema(description = "편지 식별자", example = "55") long letterId,
    @Schema(description = "편지 제목", example = "오늘 너무 지쳐요") String title,
    @Schema(description = "원본 편지 내용", example = "누군가 제 이야기를 들어줬으면 좋겠어요.") String content,
    @Schema(description = "원본 내용 요약", example = "지친 하루에 위로가 필요한 상태") String summary,
    @Schema(description = "답장 내용", example = "당신 잘하고 있어요. 오늘은 조금만 쉬어도 괜찮아요.") String replyContent,
    @Schema(description = "답장 요약", example = "따뜻한 위로와 휴식을 권하는 답장") String replySummary,
    @Schema(description = "현재 편지 상태", example = "REPLIED") String status,
    @Schema(description = "편지 생성 시각", example = "2026-04-10T08:40:00") LocalDateTime createdAt,
    @Schema(description = "답장 생성 시각", example = "2026-04-10T09:15:00") LocalDateTime replyCreatedAt,
    @Schema(description = "발신자 요약 정보") AdminLetterMemberSummary sender,
    @Schema(description = "수신자 요약 정보") AdminLetterMemberSummary receiver,
    @Schema(description = "운영 조치 로그 목록") List<AdminLetterActionLogItem> actionLogs) {

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

  @Schema(description = "편지 참여 회원 요약 정보")
  public record AdminLetterMemberSummary(
      @Schema(description = "회원 식별자", example = "17") Long memberId,
      @Schema(description = "회원 닉네임", example = "마음온데모") String nickname,
      @Schema(description = "회원 상태", example = "ACTIVE") String status,
      @Schema(description = "랜덤 수신 허용 여부", example = "true") boolean randomReceiveAllowed) {
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
