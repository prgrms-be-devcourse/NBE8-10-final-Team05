package com.back.global.security.jwt;

import java.util.List;

/** JWT에서 추출한 사용자 식별 정보와 권한 목록을 담는 DTO. */
public record JwtSubject(Integer memberId, String email, List<String> roles) {}
