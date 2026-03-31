package com.back.letter.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LetterStatus {
    SENT("답변 대기"),
    ACCEPTED("수신자가 읽음"),  // 추가
    WRITING("답변 작성 중"),   // 추가
    REPLIED("답변 완료");

    private final String description;
}
