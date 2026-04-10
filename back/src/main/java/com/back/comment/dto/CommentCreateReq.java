package com.back.comment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "댓글 또는 대댓글 생성 요청")
public record CommentCreateReq(
        @NotBlank(message = "내용을 입력해주세요.")
        @Schema(description = "댓글 내용", example = "당신 잘하고 있어요. 오늘은 조금만 쉬어도 괜찮아요.")
        String content,
        @Schema(description = "작성자 식별자. 서버 인증정보와 함께 사용되는 보조 값", example = "17")
        Long authorId,
        @Schema(description = "대댓글인 경우 부모 댓글 식별자. 일반 댓글이면 null", example = "55")
        Long parentCommentId

) {
}
