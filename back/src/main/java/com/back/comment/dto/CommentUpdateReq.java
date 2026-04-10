package com.back.comment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "댓글 수정 요청")
public record CommentUpdateReq(
        @NotBlank(message = "내용을 입력해주세요.")
        @Schema(description = "수정할 댓글 내용", example = "정말 공감돼요. 천천히 회복하면 됩니다.")
        String content
) {
}
