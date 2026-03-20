package com.back.post.dto;

import jakarta.validation.constraints.NotBlank;

public record PostUpdateReq(

        @NotBlank(message = "제목은 필수 입력 항목입니다.")
            String title,

        @NotBlank(message = "본문은 필수 입력 항목입니다.")
            String content,


            String thumbnail
) {
}
