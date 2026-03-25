package com.back.diary.adapter.application.port.in.dto;

import com.back.diary.domain.Diary;

import java.time.LocalDateTime;

public record DiaryRes(
    Long id,
    String title,
    String content,
    String categoryName,
    String nickname,
    LocalDateTime createDate,
    boolean isPrivate
) {
    public static DiaryRes from(Diary diary) {
        return new DiaryRes(
            diary.getId(),
            diary.getTitle(),
            diary.getContent(),
            diary.getCategoryName(),
            diary.getNickname(),
                diary.getCreateDate(),
        diary.isPrivate()
        );
    }
}
