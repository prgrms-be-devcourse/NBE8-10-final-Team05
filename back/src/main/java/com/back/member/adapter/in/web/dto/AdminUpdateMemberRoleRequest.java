package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "운영자 회원 권한 변경 요청")
public record AdminUpdateMemberRoleRequest(
    @Schema(description = "적용할 회원 권한", example = "ADMIN") String role,
    @Schema(description = "권한 변경 사유", example = "운영팀 계정 승격") String reason) {}
