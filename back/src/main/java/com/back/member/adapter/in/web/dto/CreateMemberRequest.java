package com.back.member.adapter.in.web.dto;

/** 회원 생성 요청 DTO. */
public record CreateMemberRequest(String email, String password, String nickname) {}
