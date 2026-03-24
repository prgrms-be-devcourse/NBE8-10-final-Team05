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
    boolean isPrivate
) {
    // Service 계층에서 엔티티로 변환할 때 사용
    public Diary toEntity(Long memberId, String nickname) {
        return Diary.builder()
            .memberId(memberId)// Member 객체 연관관계 설정
                .nickname(nickname) // DB의 NOT NULL 제약조건 해결
            .title(title)
            .content(content)
            .categoryName(categoryName)
            .build();
    }
}
