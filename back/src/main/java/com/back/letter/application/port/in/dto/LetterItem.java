package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "편지 보관함 목록의 단건 항목")
public record LetterItem(
    @Schema(description = "편지 식별자", example = "55") long id,
    @Schema(description = "편지 제목", example = "오늘 너무 지쳐요") String title,
    @Schema(description = "작성 시각", example = "2026-04-10T08:40:00") LocalDateTime createdDate,
    @Schema(description = "편지 상태", implementation = LetterStatus.class, example = "SENT") LetterStatus status
) {
    public static LetterItem from(Letter letter) {
        return new LetterItem(
            letter.getId(),
            letter.getTitle(),
            letter.getCreateDate(),
                letter.getStatus()
        );
    }

    public static LetterItem from(Letter letter, boolean isWriting) {
        return new LetterItem(
                letter.getId(),
                letter.getTitle(),
                letter.getCreateDate(),
                isWriting ? LetterStatus.WRITING : letter.getStatus()
        );
    }
}
