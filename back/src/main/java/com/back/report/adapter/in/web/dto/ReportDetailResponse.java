package com.back.report.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "운영자 신고 상세 응답")
public record ReportDetailResponse(
        @Schema(description = "신고 식별자", example = "9001") Long reportId,
        @Schema(description = "신고자 닉네임", example = "마음온데모") String reporterNickname,
        @Schema(description = "신고 사유", example = "PROFANITY") String reason,
        @Schema(description = "상세 신고 내용", example = "지속적인 욕설과 비방 표현이 포함되어 있습니다.") String description,
        @Schema(description = "처리 상태", example = "PROCESSED") String status,
        @Schema(description = "운영 처리 결과", example = "DELETE") String processingAction,
        @Schema(description = "접수 시각", example = "2026-04-10T07:30:00") LocalDateTime createdAt,
        @Schema(description = "신고 대상 상세 정보") TargetInfo targetInfo
) {
    @Schema(description = "신고 대상 상세 정보")
    public record TargetInfo(
            @Schema(description = "신고 대상 유형", example = "POST") String targetType,
            @Schema(description = "신고 대상 식별자", example = "101") Long targetId,
            @Schema(description = "원본 내용", example = "상대방을 향한 욕설이 포함된 게시글 내용") String originalContent,
            @Schema(description = "원본 작성자 닉네임", example = "익명사용자") String authorNickname
    ) {}
}
