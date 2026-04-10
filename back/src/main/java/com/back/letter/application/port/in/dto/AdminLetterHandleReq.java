package com.back.letter.application.port.in.dto;

import com.back.letter.domain.AdminLetterActionType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "운영자 편지 조치 요청")
public record AdminLetterHandleReq(
    @Schema(description = "수행할 조치", implementation = AdminLetterActionType.class, example = "NOTE")
        AdminLetterActionType action,
    @Schema(description = "조치 메모", example = "수신자를 재배정하기 전에 검토 메모를 남깁니다.") String memo) {}
