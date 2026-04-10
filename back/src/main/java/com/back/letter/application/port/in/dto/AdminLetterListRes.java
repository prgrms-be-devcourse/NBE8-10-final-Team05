package com.back.letter.application.port.in.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

@Schema(description = "운영자 편지 목록 페이지 응답")
public record AdminLetterListRes(
    @Schema(description = "현재 페이지 편지 목록") List<AdminLetterListItem> letters,
    @Schema(description = "전체 페이지 수", example = "5") int totalPages,
    @Schema(description = "전체 편지 수", example = "83") long totalElements,
    @Schema(description = "현재 페이지 번호", example = "0") int currentPage,
    @Schema(description = "첫 페이지 여부", example = "true") boolean isFirst,
    @Schema(description = "마지막 페이지 여부", example = "false") boolean isLast) {

  public static AdminLetterListRes from(Page<AdminLetterListItem> page) {
    return new AdminLetterListRes(
        page.getContent(),
        page.getTotalPages(),
        page.getTotalElements(),
        page.getNumber(),
        page.isFirst(),
        page.isLast());
  }
}
