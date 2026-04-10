package com.back.member.domain;

import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 권한 구분(USER: 일반 회원, ADMIN: 관리자). */
@Schema(description = "회원 권한 구분", example = "USER")
public enum MemberRole {
  USER,
  ADMIN
}
