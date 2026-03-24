package com.back.letter.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LetterStatus {
    SENT("답변 대기"),
    REPLIED("답변 완료");

    private final String description;
}
