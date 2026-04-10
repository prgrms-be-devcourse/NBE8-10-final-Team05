package com.back.post.dto;

import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostResolutionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;


@Schema(description = "게시글 상세 응답")
public record  PostInfoRes(
        @Schema(description = "게시글 식별자", example = "101") Long id,
        @Schema(description = "게시글 제목", example = "오늘 너무 지쳐요") String title,
        @Schema(description = "게시글 본문", example = "누군가 제 이야기를 들어주면 좋겠어요.") String content,
        @Schema(description = "본문 요약", example = "누군가 제 이야기를 들어주면 좋겠어요.") String summary,
        @Schema(description = "조회 수", example = "42") int viewCount,
        @Schema(description = "작성 시각", example = "2026-04-10T08:00:00") LocalDateTime createDate,
        @Schema(description = "수정 시각", example = "2026-04-10T09:10:00") LocalDateTime modifyDate,
        @Schema(description = "썸네일 이미지 URL", example = "https://cdn.example.com/post-thumb.png") String thumbnail,
        @Schema(description = "게시글 카테고리", implementation = PostCategory.class, example = "WORRY") PostCategory category,
        @Schema(description = "고민 해결 상태", implementation = PostResolutionStatus.class, example = "ONGOING") PostResolutionStatus resolutionStatus,
        @Schema(description = "작성자 식별자", example = "17") Long authorid,
        @Schema(description = "작성자 닉네임", example = "마음온데모") String nickname

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
