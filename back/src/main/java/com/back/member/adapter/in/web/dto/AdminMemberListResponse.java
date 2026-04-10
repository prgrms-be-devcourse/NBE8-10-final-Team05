package com.back.member.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

@Schema(description = "운영자 회원 목록 페이지 응답")
public record AdminMemberListResponse(
    @Schema(description = "현재 페이지 회원 목록") List<AdminMemberListItem> members,
    @Schema(description = "전체 페이지 수", example = "4") int totalPages,
    @Schema(description = "전체 회원 수", example = "68") long totalElements,
    @Schema(description = "현재 페이지 번호", example = "0") int currentPage,
    @Schema(description = "첫 페이지 여부", example = "true") boolean isFirst,
    @Schema(description = "마지막 페이지 여부", example = "false") boolean isLast) {

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
