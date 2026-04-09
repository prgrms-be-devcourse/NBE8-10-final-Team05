package com.back.letter.application.port.in.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record AdminLetterListRes(
    List<AdminLetterListItem> letters,
    int totalPages,
    long totalElements,
    int currentPage,
    boolean isFirst,
    boolean isLast) {

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
