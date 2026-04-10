package com.back.auth.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 로그인 요청 DTO. */
@Schema(description = "이메일 로그인 요청 정보")
public record AuthLoginRequest(
    @Schema(description = "가입한 이메일 주소", example = "demo@example.com") String email,
    @Schema(description = "로그인 비밀번호", example = "demo1234!") String password) {}
