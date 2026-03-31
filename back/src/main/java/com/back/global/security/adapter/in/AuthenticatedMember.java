package com.back.global.security.adapter.in;

import java.util.List;

/** SecurityContext에 저장되는 현재 로그인 사용자 식별 DTO. */
public record AuthenticatedMember(Long memberId, String email, List<String> roles) {}
