package com.back.auth.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 로그인/재발급 성공 시 반환하는 액세스 토큰 응답 DTO. */
@Schema(description = "로그인 또는 재발급 성공 시 반환되는 토큰 응답")
public record AuthTokenResponse(
    @Schema(description = "Bearer access token", example = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNyJ9.signature")
        String accessToken,
    @Schema(description = "토큰 타입", example = "Bearer") String tokenType,
    @Schema(description = "액세스 토큰 만료까지 남은 초", example = "3600") long expiresInSeconds,
    @Schema(description = "토큰에 매핑된 회원 요약 정보") AuthMemberResponse member) {}
