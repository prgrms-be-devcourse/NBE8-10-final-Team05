package com.back.report.domain;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@Schema(description = "신고 사유", example = "PROFANITY")
public enum ReportReason {
    PROFANITY("욕설 및 비방"),
    SPAM("스팸 및 광고"),
    INAPPROPRIATE("부적절한 내용"),
    PERSONAL_INFO("개인정보 노출"),
    OTHER("기타");

    private final String content;
}
