package com.back.member.adapter.in.web.dto;

import com.back.auth.domain.OAuthAccount;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "운영자 회원 상세 응답")
public record AdminMemberDetailResponse(
    @Schema(description = "회원 식별자", example = "17") Long id,
    @Schema(description = "회원 이메일", example = "demo@example.com") String email,
    @Schema(description = "회원 닉네임", example = "마음온데모") String nickname,
    @Schema(description = "회원 권한", example = "USER") String role,
    @Schema(description = "회원 상태", example = "ACTIVE") String status,
    @Schema(description = "랜덤 편지 수신 허용 여부", example = "true") boolean randomReceiveAllowed,
    @Schema(description = "소셜 계정 여부", example = "true") boolean socialAccount,
    @Schema(description = "가입 시각", example = "2026-03-01T10:00:00") LocalDateTime createdAt,
    @Schema(description = "마지막 수정 시각", example = "2026-04-10T11:00:00") LocalDateTime modifiedAt,
    @Schema(description = "마지막 로그인 시각", example = "2026-04-10T11:20:00") LocalDateTime lastLoginAt,
    @Schema(description = "연결된 OAuth 제공자 목록", example = "[\"kakao\", \"google\"]") List<String> connectedProviders,
    @Schema(description = "운영 조치 이력") List<AdminMemberActionLogItem> actionLogs,
    @Schema(description = "이 회원이 제출한 신고 이력") List<AdminMemberReportHistoryItem> submittedReports,
    @Schema(description = "이 회원이 신고당한 이력") List<AdminMemberReportHistoryItem> receivedReports,
    @Schema(description = "최근 작성 게시글") List<AdminMemberPostHistoryItem> recentPosts,
    @Schema(description = "최근 주고받은 편지") List<AdminMemberLetterHistoryItem> recentLetters) {

  public static AdminMemberDetailResponse from(
      Member member,
      List<OAuthAccount> oauthAccounts,
      List<AdminMemberActionLogItem> actionLogs,
      List<AdminMemberReportHistoryItem> submittedReports,
      List<AdminMemberReportHistoryItem> receivedReports,
      List<AdminMemberPostHistoryItem> recentPosts,
      List<AdminMemberLetterHistoryItem> recentLetters) {
    MemberRole role = member.getRole() == null ? MemberRole.USER : member.getRole();
    MemberStatus status = member.getStatus() == null ? MemberStatus.ACTIVE : member.getStatus();
    List<String> providers =
        oauthAccounts.stream().map(OAuthAccount::getProvider).distinct().toList();
    LocalDateTime lastLoginAt =
        oauthAccounts.stream()
            .map(OAuthAccount::getLastLoginAt)
            .filter(value -> value != null)
            .max(LocalDateTime::compareTo)
            .orElse(null);

    return new AdminMemberDetailResponse(
        member.getId(),
        member.getEmail(),
        member.getNickname(),
        role.name(),
        status.name(),
        member.isRandomReceiveAllowed(),
        !providers.isEmpty(),
        member.getCreateDate(),
        member.getModifyDate(),
        lastLoginAt,
        providers,
        actionLogs,
        submittedReports,
        receivedReports,
        recentPosts,
        recentLetters);
  }
}
