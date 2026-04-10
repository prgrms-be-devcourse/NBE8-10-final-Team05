package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 생성 요청 DTO. */
@Schema(description = "회원 생성 요청 정보")
public record CreateMemberRequest(
    @Schema(description = "가입 이메일", example = "new-user@example.com") String email,
    @Schema(description = "초기 비밀번호", example = "demo1234!") String password,
    @Schema(description = "초기 닉네임", example = "새로운사용자") String nickname) {}
