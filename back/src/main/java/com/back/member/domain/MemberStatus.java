package com.back.member.domain;

import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 상태(ACTIVE: 정상, BLOCKED: 운영 차단, WITHDRAWN: 탈퇴). */
@Schema(description = "회원 상태 구분", example = "ACTIVE")
public enum MemberStatus {
  ACTIVE,
  BLOCKED,
  WITHDRAWN
}
