package com.back.post.dto;

import com.back.post.entity.PostCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PostUpdateReq(

        @NotBlank(message = "제목은 필수 입력 항목입니다.")
            String title,

        @NotBlank(message = "본문은 필수 입력 항목입니다.")
            String content,


            String thumbnail,

            @NotNull(message = "카테고리는 필수 선택 항목입니다.")
            PostCategory category
) {
}
