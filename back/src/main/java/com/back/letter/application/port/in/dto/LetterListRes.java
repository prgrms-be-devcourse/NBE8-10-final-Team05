package com.back.letter.application.port.in.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Page;

import java.util.List;

@Schema(description = "편지 보관함 페이지 응답")
public record LetterListRes(
    @Schema(description = "현재 페이지 편지 목록") List<LetterItem> letters,
    @Schema(description = "전체 페이지 수", example = "3") int totalPages,
    @Schema(description = "전체 편지 수", example = "24") long totalElements,
    @Schema(description = "현재 페이지 번호", example = "0") int currentPage,
    @Schema(description = "첫 페이지 여부", example = "true") boolean isFirst,
    @Schema(description = "마지막 페이지 여부", example = "false") boolean isLast
) {
    public static LetterListRes from(Page<LetterItem> page){
        return new LetterListRes(
                page.getContent(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.getNumber(),
                page.isFirst(),
                page.isLast()
        );
    }
}
