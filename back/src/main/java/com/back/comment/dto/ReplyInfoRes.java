package com.back.comment.dto;

import com.back.comment.entity.Comment;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;

public record ReplyInfoRes(

        long id,
        String content,
        long authorId,
        String nickname,
        String email,
        long postId,
        LocalDateTime createDate,
        LocalDateTime modifyDate

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
