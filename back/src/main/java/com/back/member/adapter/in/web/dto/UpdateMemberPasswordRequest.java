package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 비밀번호 변경 요청 DTO. */
@Schema(description = "회원 비밀번호 변경 요청")
public record UpdateMemberPasswordRequest(
    @Schema(description = "현재 비밀번호", example = "oldPassword123!") String currentPassword,
    @Schema(description = "새 비밀번호", example = "newPassword123!") String newPassword) {}
