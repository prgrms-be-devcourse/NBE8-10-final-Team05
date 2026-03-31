package com.back.report.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReportStatus {
    RECEIVED("접수"),
    PROCESSED("처리됨");

    private final String description;
}