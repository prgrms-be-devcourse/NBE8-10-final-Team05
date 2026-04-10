package com.back.report.domain;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "신고 대상 유형", example = "POST")
public enum TargetType {
    POST, LETTER, COMMENT
}
