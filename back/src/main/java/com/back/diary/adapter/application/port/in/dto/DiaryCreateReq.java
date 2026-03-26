package com.back.diary.adapter.application.port.in.dto;

import com.back.diary.domain.Diary;
import jakarta.validation.constraints.NotBlank;

public record DiaryCreateReq(
    @NotBlank(message = "제목을 입력해주세요.")
    String title,
    
    @NotBlank(message = "내용을 입력해주세요.")
    String content,
    
    @NotBlank(message = "카테고리를 선택해주세요.")
    String categoryName,
    boolean isPrivate,
    String imageUrl
) {
    // Service 계층에서 엔티티로 변환할 때 사용
    public Diary toEntity(Long memberId, String nickname) {
        return Diary.builder()
            .memberId(memberId)
                .nickname(nickname)
            .title(title)
            .content(content)
                .imageUrl(imageUrl)
            .categoryName(categoryName)
            .build();
    }
}
