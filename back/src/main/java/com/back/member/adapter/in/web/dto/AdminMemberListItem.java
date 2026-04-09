package com.back.member.adapter.in.web.dto;

import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import java.time.LocalDateTime;

public record AdminMemberListItem(
    Long id,
    String email,
    String nickname,
    String role,
    String status,
    boolean randomReceiveAllowed,
    boolean socialAccount,
    LocalDateTime createdAt,
    LocalDateTime lastLoginAt) {

  public static AdminMemberListItem from(
      Member member, boolean socialAccount, LocalDateTime lastLoginAt) {
    MemberRole role = member.getRole() == null ? MemberRole.USER : member.getRole();
    MemberStatus status = member.getStatus() == null ? MemberStatus.ACTIVE : member.getStatus();

    return new AdminMemberListItem(
        member.getId(),
        member.getEmail(),
        member.getNickname(),
        role.name(),
        status.name(),
        member.isRandomReceiveAllowed(),
        socialAccount,
        member.getCreateDate(),
        lastLoginAt);
  }
}
