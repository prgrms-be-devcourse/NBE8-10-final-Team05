package com.back.letter.domain;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@Schema(description = "편지 진행 상태", example = "SENT")
public enum LetterStatus {
    SENT("답변 대기"),
    ACCEPTED("수신자가 읽음"),  // 추가
    WRITING("답변 작성 중"),   // 추가
    REPLIED("답변 완료");

    private final String description;
}
