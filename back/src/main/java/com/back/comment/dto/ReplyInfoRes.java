package com.back.comment.dto;

import com.back.comment.entity.Comment;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;

@Schema(description = "대댓글 응답")
public record ReplyInfoRes(

        @Schema(description = "대댓글 식별자", example = "88") long id,
        @Schema(description = "대댓글 내용", example = "오늘 하루는 충분히 버텨낸 것만으로도 의미 있어요.") String content,
        @Schema(description = "작성자 식별자", example = "21") long authorId,
        @Schema(description = "작성자 닉네임", example = "조용한별") String nickname,
        @Schema(description = "작성자 이메일", example = "nested@example.com") String email,
        @Schema(description = "원글 게시글 식별자", example = "101") long postId,
        @Schema(description = "작성 시각", example = "2026-04-10T10:30:00") LocalDateTime createDate,
        @Schema(description = "수정 시각", example = "2026-04-10T10:31:00") LocalDateTime modifyDate

) {
    public ReplyInfoRes(Comment comment){
        this(
                comment.getId(),
                comment.getContent(),
                comment.getAuthor().getId(),
                comment.getAuthor().getNickname(),
                comment.getAuthor().getEmail(),
                comment.getPost().getId(),
                comment.getCreateDate(),
                comment.getModifyDate()
        );
    }
}
