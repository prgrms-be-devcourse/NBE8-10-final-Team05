package com.back.letter.application.port.in.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "편지 작성 요청")
public record CreateLetterReq(
        @NotBlank @Schema(description = "편지 제목", example = "오늘 너무 지쳐요") String title,
        @NotBlank
        @Schema(description = "편지 본문", example = "누군가 제 이야기를 들어줬으면 좋겠어요.")
        String content
) {
}
