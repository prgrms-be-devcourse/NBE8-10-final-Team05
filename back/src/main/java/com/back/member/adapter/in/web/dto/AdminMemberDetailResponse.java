package com.back.member.adapter.in.web.dto;

import com.back.auth.domain.OAuthAccount;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import java.time.LocalDateTime;
import java.util.List;

public record AdminMemberDetailResponse(
    Long id,
    String email,
    String nickname,
    String role,
    String status,
    boolean randomReceiveAllowed,
    boolean socialAccount,
    LocalDateTime createdAt,
    LocalDateTime modifiedAt,
    LocalDateTime lastLoginAt,
    List<String> connectedProviders,
    List<AdminMemberActionLogItem> actionLogs,
    List<AdminMemberReportHistoryItem> submittedReports,
    List<AdminMemberReportHistoryItem> receivedReports,
    List<AdminMemberPostHistoryItem> recentPosts,
    List<AdminMemberLetterHistoryItem> recentLetters) {

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
