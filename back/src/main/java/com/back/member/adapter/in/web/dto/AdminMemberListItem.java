package com.back.member.adapter.in.web.dto;

import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import java.time.LocalDateTime;
import java.util.Locale;

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

  public static AdminMemberListItem from(MemberRepository.AdminMemberListRow row) {
    return new AdminMemberListItem(
        row.getId(),
        row.getEmail(),
        row.getNickname(),
        normalizeRole(row.getRawRole()),
        normalizeStatus(row.getRawStatus()),
        Boolean.TRUE.equals(row.getRandomReceiveAllowed()),
        Boolean.TRUE.equals(row.getSocialAccount()),
        row.getCreatedAt(),
        row.getLastLoginAt());
  }

  private static String normalizeRole(String rawRole) {
    if (rawRole == null || rawRole.isBlank()) {
      return MemberRole.USER.name();
    }

    try {
      return MemberRole.valueOf(rawRole.trim().toUpperCase(Locale.ROOT)).name();
    } catch (IllegalArgumentException exception) {
      return MemberRole.USER.name();
    }
  }

  private static String normalizeStatus(String rawStatus) {
    if (rawStatus == null || rawStatus.isBlank()) {
      return MemberStatus.ACTIVE.name();
    }

    try {
      return MemberStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT)).name();
    } catch (IllegalArgumentException exception) {
      return MemberStatus.ACTIVE.name();
    }
  }
}
