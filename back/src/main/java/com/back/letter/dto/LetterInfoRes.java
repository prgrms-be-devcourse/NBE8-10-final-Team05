package com.back.letter.dto;

import com.back.letter.entity.Letter;

import java.time.LocalDateTime;

public record LetterInfoRes(
        int id,
        String title,
        String content,
        String replyContent,
        String status,
        LocalDateTime createdDate,
        LocalDateTime replyCreateDate
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
