package com.back.censorship.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "AI 콘텐츠 안전 점검 요청")
public record AuditAiRequest(
        @Schema(description = "점검할 원문", example = "전화번호는 010-1234-5678이고 너무 화가 나.")
        String content,
        @Schema(description = "콘텐츠 유형", example = "Letter") String type // Letter, Post
) {}
