package com.back.member.adapter.in.web.dto;

import com.back.post.entity.Post;
import java.time.LocalDateTime;

public record AdminMemberPostHistoryItem(
    Long postId,
    String title,
    String category,
    String status,
    String resolutionStatus,
    LocalDateTime createdAt) {

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
