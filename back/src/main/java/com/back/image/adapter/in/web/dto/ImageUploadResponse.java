package com.back.image.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "이미지 업로드 응답")
public record ImageUploadResponse(
    @Schema(description = "업로드 후 접근 가능한 이미지 URL", example = "https://cdn.example.com/images/diary-123.png")
        String imageUrl) {}
