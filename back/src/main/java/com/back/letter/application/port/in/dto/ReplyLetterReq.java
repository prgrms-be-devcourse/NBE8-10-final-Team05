package com.back.letter.application.port.in.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "편지 답장 작성 요청")
public record ReplyLetterReq(
    @NotBlank
    @Schema(description = "답장 내용", example = "당신 잘하고 있어요. 오늘은 조금만 쉬어도 괜찮아요.")
    String replyContent
) {}
