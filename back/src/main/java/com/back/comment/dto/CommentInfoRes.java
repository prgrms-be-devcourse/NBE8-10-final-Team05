package com.back.comment.dto;

import com.back.comment.entity.Comment;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "댓글 상세 응답")
public record CommentInfoRes(

        @Schema(description = "댓글 식별자", example = "55") long id,
        @Schema(description = "댓글 내용", example = "정말 공감돼요. 천천히 회복하면 됩니다.") String content,
        @Schema(description = "작성자 식별자", example = "17") long authorId,
        @Schema(description = "작성자 닉네임", example = "다정한고래") String nickname,
        @Schema(description = "작성자 이메일", example = "reply@example.com") String email,
        @Schema(description = "원글 게시글 식별자", example = "101") long postId,
        @Schema(description = "작성 시각", example = "2026-04-10T10:20:00") LocalDateTime createDate,
        @Schema(description = "수정 시각", example = "2026-04-10T10:25:00") LocalDateTime modifyDate,
        @Schema(description = "대댓글 목록") List<ReplyInfoRes> replies
) {
    public CommentInfoRes(Comment comment, List<ReplyInfoRes> replies){
        this(
                comment.getId(),
                comment.getContent(),
                comment.getAuthor().getId(),
                comment.getAuthor().getNickname(),
                comment.getAuthor().getEmail(),
                comment.getPost().getId(),
                comment.getCreateDate(),
                comment.getModifyDate(),
                replies
        );
    }
}
