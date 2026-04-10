package com.back.post.dto;
/* 게시물 생성을 위한 전달받은 요청 데이터 구조입니다. */

import com.back.post.entity.PostCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "게시글 생성 요청")
public record PostCreateReq(
        @NotBlank(message = "제목은 필수 입력 항목입니다.")
        @Schema(description = "게시글 제목", example = "오늘 너무 지쳐요")
        String title,

        @NotBlank(message = "본문은 필수 입력 항목입니다.")
        @Schema(description = "게시글 본문", example = "누군가 제 이야기를 들어주면 좋겠어요.")
        String content,

        @Schema(description = "썸네일 이미지 URL", example = "https://cdn.example.com/post-thumb.png")
        String thumbnail,

        @NotNull(message = "카테고리는 필수 선택 항목입니다.")
        @Schema(description = "게시글 카테고리", implementation = PostCategory.class, example = "WORRY")
        PostCategory category
) {
}
