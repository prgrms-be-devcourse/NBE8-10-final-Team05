package com.back.letter.dto;

import com.back.letter.entity.Letter;
import java.time.LocalDateTime;

public record LetterItem(
    int id,
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
