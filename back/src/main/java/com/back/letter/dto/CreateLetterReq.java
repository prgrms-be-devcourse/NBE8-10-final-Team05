package com.back.letter.dto;
import jakarta.validation.constraints.NotBlank;

public record CreateLetterReq(
        @NotBlank String title,
        @NotBlank String content
) {
}
