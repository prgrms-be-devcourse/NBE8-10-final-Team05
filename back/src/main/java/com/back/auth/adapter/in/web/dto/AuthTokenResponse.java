package com.back.auth.adapter.in.web.dto;

/** 로그인/재발급 성공 시 반환하는 액세스 토큰 응답 DTO. */
public record AuthTokenResponse(
    String accessToken, String tokenType, long expiresInSeconds, AuthMemberResponse member) {}
