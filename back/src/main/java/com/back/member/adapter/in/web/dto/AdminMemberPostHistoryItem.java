package com.back.member.adapter.in.web.dto;

import com.back.post.entity.Post;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 회원 상세 화면의 최근 게시글 이력")
public record AdminMemberPostHistoryItem(
    @Schema(description = "게시글 식별자", example = "101") Long postId,
    @Schema(description = "게시글 제목", example = "오늘 너무 지쳐요") String title,
    @Schema(description = "게시글 카테고리", example = "WORRY") String category,
    @Schema(description = "게시글 상태", example = "PUBLISHED") String status,
    @Schema(description = "고민 해결 상태", example = "ONGOING") String resolutionStatus,
    @Schema(description = "작성 시각", example = "2026-04-10T08:15:00") LocalDateTime createdAt) {

  public static AdminMemberPostHistoryItem from(Post post) {
    return new AdminMemberPostHistoryItem(
        post.getId(),
        post.getTitle(),
        post.getCategory().name(),
        post.getStatus().name(),
        post.getResolutionStatus().name(),
        post.getCreateDate());
  }
}
