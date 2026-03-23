package com.back.post.dto;

import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;

import java.time.LocalDateTime;

public record PostListRes(

        Long id,
        String title,
        int viewCount,
        LocalDateTime createDate,
        LocalDateTime modifyDate,
        String thumbnail,
        PostCategory category,
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
               post.getCategory(),
               post.getMember().getNickname()
       );

    }

}
