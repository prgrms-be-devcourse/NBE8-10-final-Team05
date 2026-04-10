package com.back.auth.adapter.in.web.dto;

import com.back.member.domain.Member;
import io.swagger.v3.oas.annotations.media.Schema;

/** 인증 API에서 사용하는 회원 정보 응답 DTO. */
@Schema(description = "인증 응답에 포함되는 현재 사용자 요약 정보")
public record AuthMemberResponse(
    @Schema(description = "회원 식별자", example = "17") Long id,
    @Schema(description = "회원 이메일", example = "demo@example.com") String email,
    @Schema(description = "표시 닉네임", example = "마음온데모") String nickname,
    @Schema(description = "회원 권한", example = "USER") String role,
    @Schema(description = "회원 상태", example = "ACTIVE") String status) {

  /** Member 엔티티를 인증 응답용 DTO로 변환한다. */
  public static AuthMemberResponse from(Member member) {
    return new AuthMemberResponse(
        member.getId(),
        member.getEmail(),
        member.getNickname(),
        member.getRole().name(),
        member.getStatus().name());
  }
}
