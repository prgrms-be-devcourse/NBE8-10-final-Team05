package com.back.post.dto;

import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostResolutionStatus;

import java.time.LocalDateTime;

public record PostListRes(

        Long id,
        String title,
        int viewCount,
        LocalDateTime createDate,
        LocalDateTime modifyDate,
        String thumbnail,
        String summary,
        PostCategory category,
        PostResolutionStatus resolutionStatus,
        String nickname
) {

   public static PostListRes from(Post post){

       return new PostListRes(
               post.getId(),
               post.getTitle(),
               post.getViewCount(),
               post.getCreateDate(),
               post.getModifyDate(),
               post.getThumbnail(),
               post.getSummary(),
               post.getCategory(),
               post.getResolutionStatus(),
               post.getMember().getNickname()
       );

    }

}
