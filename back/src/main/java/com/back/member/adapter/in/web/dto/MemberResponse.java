package com.back.member.adapter.in.web.dto;

import com.back.member.domain.Member;

/** 회원 응답 DTO. */
public record MemberResponse(Long id, String email, String nickname, boolean randomReceiveAllowed) {

  /** Member 엔티티를 API 응답 객체로 변환한다. */
  public static MemberResponse from(Member member) {
    return new MemberResponse(member.getId(), member.getEmail(), member.getNickname(),member.isRandomReceiveAllowed());
  }
}
