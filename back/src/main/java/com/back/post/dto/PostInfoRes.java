package com.back.post.dto;


import com.back.post.entity.Post;
import java.time.LocalDateTime;


public record  PostInfoRes(
        Long id,
        String title,
        String content,
        int viewCount,
        LocalDateTime createDate,
        LocalDateTime modifyDate,
        String thumbnail,
        Long authorid,
        String nickname

) {
    public static  PostInfoRes from(Post post) {

      return new PostInfoRes(
        post.getId(),
        post.getTitle(),
        post.getContent(),
        post.getViewCount(),
        post.getCreateDate(),
        post.getModifyDate(),
        post.getThumbnail(),
        post.getMember().getId(),
        post.getMember().getNickname()


      );
    }
}
