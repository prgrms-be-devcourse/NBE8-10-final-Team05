package com.back.diary.adapter.application.port.in.dto;

import com.back.diary.domain.Diary;

import java.time.LocalDateTime;

public record DiaryRes(
    Long id,
    String title,
    String content,
    String categoryName,
    String nickname,
    String imageUrl,
    boolean isPrivate,
    LocalDateTime createDate,
    LocalDateTime modifyDate
) {
    public static DiaryRes from(Diary diary) {
        return new DiaryRes(
            diary.getId(),
            diary.getTitle(),
            diary.getContent(),
            diary.getCategoryName(),
            diary.getNickname(),
            diary.getImageUrl(),
            diary.isPrivate(),
            diary.getCreateDate(),
            diary.getModifyDate()
        );
    }
}
