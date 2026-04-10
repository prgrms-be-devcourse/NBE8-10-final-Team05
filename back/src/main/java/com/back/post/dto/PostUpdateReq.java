package com.back.post.dto;

import com.back.post.entity.PostCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "게시글 수정 요청")
public record PostUpdateReq(

        @NotBlank(message = "제목은 필수 입력 항목입니다.")
            @Schema(description = "수정할 게시글 제목", example = "오늘은 조금 나아졌어요")
            String title,

        @NotBlank(message = "본문은 필수 입력 항목입니다.")
            @Schema(description = "수정할 게시글 본문", example = "조언 덕분에 한결 편안해졌어요.")
            String content,


            @Schema(description = "수정할 썸네일 이미지 URL", example = "https://cdn.example.com/post-thumb-updated.png")
            String thumbnail,

            @NotNull(message = "카테고리는 필수 선택 항목입니다.")
            @Schema(description = "수정할 카테고리", implementation = PostCategory.class, example = "DAILY")
            PostCategory category
) {
}
