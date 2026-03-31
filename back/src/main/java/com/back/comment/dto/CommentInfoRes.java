package com.back.comment.dto;

import com.back.comment.entity.Comment;
import java.time.LocalDateTime;
import java.util.List;

public record CommentInfoRes(

        long id,
        String content,
        long authorId,
        String nickname,
        String email,
        long postId,
        LocalDateTime createDate,
        LocalDateTime modifyDate,
        List<ReplyInfoRes> replies
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
