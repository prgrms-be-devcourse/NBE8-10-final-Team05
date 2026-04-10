package com.back.censorship.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "AI 콘텐츠 안전 점검 결과")
public record AuditAiResponse(
        @Schema(description = "통과 여부", example = "false") boolean isPassed,
        @Schema(description = "위반 유형", example = "PERSONAL_INFO") String violationType,
        @Schema(description = "사용자 안내 메시지", example = "개인정보가 포함되어 있어 수정이 필요합니다.") String message,
        @Schema(description = "AI 요약 결과", example = "전화번호가 포함된 표현이 감지되었습니다.") String summary
) {}
