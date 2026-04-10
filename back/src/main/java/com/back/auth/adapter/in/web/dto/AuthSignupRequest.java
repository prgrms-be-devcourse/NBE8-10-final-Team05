package com.back.auth.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 가입 요청 DTO. */
@Schema(description = "이메일 기반 일반 회원가입 요청 정보")
public record AuthSignupRequest(
    @Schema(description = "중복되지 않는 이메일 주소", example = "demo@example.com") String email,
    @Schema(description = "영문, 숫자, 특수문자를 조합한 비밀번호", example = "demo1234!") String password,
    @Schema(description = "서비스에서 표시할 닉네임", example = "마음온데모") String nickname) {}
