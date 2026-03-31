package com.back.report.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReportReason {
    PROFANITY("욕설 및 비방"),
    SPAM("스팸 및 광고"),
    INAPPROPRIATE("부적절한 내용"),
    PERSONAL_INFO("개인정보 노출"),
    OTHER("기타");

    private final String content;
}