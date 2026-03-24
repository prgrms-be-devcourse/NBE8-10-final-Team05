package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import java.time.LocalDateTime;

public record LetterItem(
    long id,
    String title,
    LocalDateTime createdDate,
    boolean isReplied
) {
    public static LetterItem from(Letter letter) {
        return new LetterItem(
            letter.getId(),
            letter.getTitle(),
            letter.getCreateDate(),
            letter.getReplyContent() != null
        );
    }
}
