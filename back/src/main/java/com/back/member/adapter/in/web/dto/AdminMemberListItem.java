package com.back.member.adapter.in.web.dto;

import com.back.member.domain.Member;
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
    return new AdminMemberListItem(
        member.getId(),
        member.getEmail(),
        member.getNickname(),
        member.getRole().name(),
        member.getStatus().name(),
        member.isRandomReceiveAllowed(),
        socialAccount,
        member.getCreateDate(),
        lastLoginAt);
  }
}
