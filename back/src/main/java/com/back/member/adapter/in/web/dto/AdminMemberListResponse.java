package com.back.member.adapter.in.web.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record AdminMemberListResponse(
    List<AdminMemberListItem> members,
    int totalPages,
    long totalElements,
    int currentPage,
    boolean isFirst,
    boolean isLast) {

  public static AdminMemberListResponse from(Page<AdminMemberListItem> page) {
    return new AdminMemberListResponse(
        page.getContent(),
        page.getTotalPages(),
        page.getTotalElements(),
        page.getNumber(),
        page.isFirst(),
        page.isLast());
  }
}
