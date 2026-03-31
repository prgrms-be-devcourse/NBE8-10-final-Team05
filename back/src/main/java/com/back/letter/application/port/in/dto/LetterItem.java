package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;

import java.time.LocalDateTime;

public record LetterItem(
    long id,
    String title,
    LocalDateTime createdDate,
    LetterStatus status
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
