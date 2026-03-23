package com.back.diary.dto;

import com.back.diary.entity.Diary;

import java.time.LocalDateTime;

public record DiaryListRes(
    Long id,
    String title,
    String categoryName,
    LocalDateTime createdDate
) {
    public static DiaryListRes from(Diary diary) {
        return new DiaryListRes(
            diary.getId(),
            diary.getTitle(),
            diary.getCategoryName(),
            diary.getCreateDate()
        );
    }
}
