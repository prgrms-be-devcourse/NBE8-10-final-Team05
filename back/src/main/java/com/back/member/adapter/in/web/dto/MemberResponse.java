package com.back.member.adapter.in.web.dto;

import com.back.member.domain.Member;

public record MemberResponse(Long id, String email, String nickname) {

  public static MemberResponse from(Member member) {
    return new MemberResponse(member.getId(), member.getEmail(), member.getNickname());
  }
}
