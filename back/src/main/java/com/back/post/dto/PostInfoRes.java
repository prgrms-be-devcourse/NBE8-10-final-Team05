package com.back.post.dto;

import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostResolutionStatus;
import java.time.LocalDateTime;


public record  PostInfoRes(
        Long id,
        String title,
        String content,
        String summary,
        int viewCount,
        LocalDateTime createDate,
        LocalDateTime modifyDate,
        String thumbnail,
        PostCategory category,
        PostResolutionStatus resolutionStatus,
        Long authorid,
        String nickname

) {
    public static  PostInfoRes from(Post post) {
      return from(post, post.getViewCount());
    }

    public static PostInfoRes from(Post post, int viewCount) {
      return new PostInfoRes(
        post.getId(),
        post.getTitle(),
        post.getContent(),
        post.getSummary(),
        viewCount,
        post.getCreateDate(),
        post.getModifyDate(),
        post.getThumbnail(),
        post.getCategory(),
        post.getResolutionStatus(),
        post.getMember().getId(),
        post.getMember().getNickname()
      );
    }
}
