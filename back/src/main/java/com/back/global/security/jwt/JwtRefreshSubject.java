package com.back.global.security.jwt;

/** 리프레시 토큰에서 추출한 사용자 식별자와 회전 식별자(jti/familyId)를 담는 DTO. */
public record JwtRefreshSubject(Long memberId, String jti, String familyId) {}
