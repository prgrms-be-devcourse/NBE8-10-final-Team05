package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 본인 프로필 수정 요청 DTO. */
@Schema(description = "회원 프로필 수정 요청")
public record UpdateMemberProfileRequest(
    @Schema(description = "변경할 닉네임", example = "조용한밤") String nickname) {}
