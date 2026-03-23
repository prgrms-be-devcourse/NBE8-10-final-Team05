package com.back.post.dto;

import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import java.time.LocalDateTime;


public record  PostInfoRes(
        Long id,
        String title,
        String content,
        int viewCount,
        LocalDateTime createDate,
        LocalDateTime modifyDate,
        String thumbnail,
        PostCategory category,
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
        post.getCategory(),
        post.getMember().getId(),
        post.getMember().getNickname()
      );
    }
}
