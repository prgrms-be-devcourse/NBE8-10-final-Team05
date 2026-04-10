package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 회원 탈퇴 요청 DTO. */
@Schema(description = "회원 탈퇴 검증 요청")
public record WithdrawMemberRequest(
    @Schema(description = "본인 확인용 현재 비밀번호", example = "demo1234!") String currentPassword) {}
