package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "운영자 회원 상태 변경 요청")
public record AdminUpdateMemberStatusRequest(
    @Schema(description = "적용할 회원 상태", example = "BLOCKED") String status,
    @Schema(description = "상태 변경 사유", example = "욕설 신고가 반복되어 7일 정지") String reason,
    @Schema(description = "상태 변경 후 기존 세션 강제 종료 여부", example = "true") Boolean revokeSessions) {}
