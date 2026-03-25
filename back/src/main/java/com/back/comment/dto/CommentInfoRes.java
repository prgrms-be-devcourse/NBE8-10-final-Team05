package com.back.comment.dto;

import com.back.comment.entity.Comment;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record CommentInfoRes(

        long id,
        String content,
        long authorId,
        String nickname,
        String email,
        long postId,
        LocalDateTime createDate,
        LocalDateTime modifyDate
) {
    public CommentInfoRes(Comment comment){
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
