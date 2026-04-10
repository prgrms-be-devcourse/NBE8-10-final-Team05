package com.back.member.adapter.in.web.dto;

import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Locale;

@Schema(description = "운영자 회원 목록의 단건 정보")
public record AdminMemberListItem(
    @Schema(description = "회원 식별자", example = "17") Long id,
    @Schema(description = "회원 이메일", example = "demo@example.com") String email,
    @Schema(description = "회원 닉네임", example = "마음온데모") String nickname,
    @Schema(description = "회원 권한", example = "USER") String role,
    @Schema(description = "회원 상태", example = "ACTIVE") String status,
    @Schema(description = "랜덤 편지 수신 허용 여부", example = "true") boolean randomReceiveAllowed,
    @Schema(description = "소셜 로그인 연동 여부", example = "false") boolean socialAccount,
    @Schema(description = "회원 생성 시각", example = "2026-04-10T09:30:00") LocalDateTime createdAt,
    @Schema(description = "마지막 로그인 시각", example = "2026-04-10T11:20:00") LocalDateTime lastLoginAt) {

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
