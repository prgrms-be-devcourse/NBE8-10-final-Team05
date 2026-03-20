package com.back.auth.adapter.in.web.dto;

import com.back.member.domain.Member;

/** 인증 API에서 사용하는 회원 정보 응답 DTO. */
public record AuthMemberResponse(
    Long id, String email, String nickname, String role, String status) {

  public static AuthMemberResponse from(Member member) {
    return new AuthMemberResponse(
        member.getId(),
        member.getEmail(),
        member.getNickname(),
        member.getRole().name(),
        member.getStatus().name());
  }
}
