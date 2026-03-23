package com.back.post.dto;
/* 게시물 생성을 위한 전달받은 요청 데이터 구조입니다. */

import com.back.post.entity.PostCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PostCreateReq(
        @NotBlank(message = "제목은 필수 입력 항목입니다.")
        String title,

        @NotBlank(message = "본문은 필수 입력 항목입니다.")
        String content,

        String thumbnail,

        @NotNull(message = "카테고리는 필수 선택 항목입니다.")
        PostCategory category
) {
}
