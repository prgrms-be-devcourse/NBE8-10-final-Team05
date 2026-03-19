package com.back.letter.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record LetterListRes(
    List<LetterItem> letters,
    int totalPages,
    long totalElements,
    int currentPage,
    boolean isFirst,
    boolean isLast
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
