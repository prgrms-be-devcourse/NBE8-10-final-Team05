package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 이메일 변경 요청 DTO. */
@Schema(description = "회원 이메일 변경 요청")
public record UpdateMemberEmailRequest(
    @Schema(description = "새 이메일 주소", example = "changed@example.com") String email) {}
