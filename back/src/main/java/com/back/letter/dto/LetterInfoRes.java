package com.back.letter.dto;

import com.back.letter.entity.Letter;
import com.back.letter.entity.LetterStatus;

import java.time.LocalDateTime;

public record LetterInfoRes(
        long id,
        String title,
        String content,
        String replyContent,
        LetterStatus status,
        LocalDateTime createdDate,
        LocalDateTime replyCreatedDate
) {
    public static LetterInfoRes from(Letter letter){
        return new LetterInfoRes(
                letter.getId(),
                letter.getTitle(),
                letter.getContent(),
                letter.getReplyContent(),
                letter.getStatus(),
                letter.getCreateDate(),
                letter.getReplyCreatedDate()
        );
    }
}
