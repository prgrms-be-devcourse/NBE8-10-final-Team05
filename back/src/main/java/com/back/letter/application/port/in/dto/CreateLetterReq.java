package com.back.letter.application.port.in.dto;
import jakarta.validation.constraints.NotBlank;

public record CreateLetterReq(
        @NotBlank String title,
        @NotBlank String content
) {
}
