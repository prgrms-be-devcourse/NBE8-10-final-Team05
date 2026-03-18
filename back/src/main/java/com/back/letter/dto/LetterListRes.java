package com.back.letter.dto;

import java.util.List;

public record LetterListRes(
    List<LetterItem> letters
) {
}
