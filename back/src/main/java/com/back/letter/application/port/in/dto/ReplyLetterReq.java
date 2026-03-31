package com.back.letter.application.port.in.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyLetterReq(
    @NotBlank String replyContent
) {}
