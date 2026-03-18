package com.back.letter.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyLetterReq(
    @NotBlank String replyContent
) {}
