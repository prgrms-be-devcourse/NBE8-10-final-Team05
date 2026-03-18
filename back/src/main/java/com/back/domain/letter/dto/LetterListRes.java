package com.back.domain.letter.dto;

import com.back.domain.letter.entity.Letter;

import java.time.LocalDateTime;
import java.util.List;

public record LetterListRes(
    List<LetterItem> letters
) {
}
