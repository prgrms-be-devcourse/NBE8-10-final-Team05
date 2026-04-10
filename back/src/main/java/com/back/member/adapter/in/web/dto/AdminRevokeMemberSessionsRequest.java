package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "운영자 세션 강제 종료 요청")
public record AdminRevokeMemberSessionsRequest(
    @Schema(description = "세션 강제 종료 사유", example = "비정상 로그인 의심") String reason) {}
