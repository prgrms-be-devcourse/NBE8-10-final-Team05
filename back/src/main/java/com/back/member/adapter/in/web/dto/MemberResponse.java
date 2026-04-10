package com.back.member.adapter.in.web.dto;

import com.back.member.domain.Member;
import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 응답 DTO. */
@Schema(description = "회원 프로필 응답")
public record MemberResponse(
    @Schema(description = "회원 식별자", example = "17") Long id,
    @Schema(description = "이메일 주소", example = "demo@example.com") String email,
    @Schema(description = "닉네임", example = "마음온데모") String nickname,
    @Schema(description = "랜덤 편지 수신 허용 여부", example = "true") boolean randomReceiveAllowed,
    @Schema(description = "소셜 계정 연동 여부", example = "false") boolean socialAccount) {

  /** Member 엔티티를 API 응답 객체로 변환한다. */
  public static MemberResponse from(Member member, boolean socialAccount) {
    return new MemberResponse(
        member.getId(),
        member.getEmail(),
        member.getNickname(),
        member.isRandomReceiveAllowed(),
        socialAccount);
  }
}
