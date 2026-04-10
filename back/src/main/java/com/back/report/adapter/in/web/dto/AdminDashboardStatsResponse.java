package com.back.report.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "운영 대시보드 요약 통계")
public record AdminDashboardStatsResponse(
        @Schema(description = "오늘 접수된 신고 수", example = "12") long todayReportsCount,
        @Schema(description = "미처리 신고 수", example = "5") long pendingReportsCount,
        @Schema(description = "처리 완료 신고 수", example = "23") long processedReportsCount,
        @Schema(description = "오늘 생성된 편지 수", example = "42") long todayLettersCount,
        @Schema(description = "오늘 작성된 일기 수", example = "11") long todayDiariesCount,
        @Schema(description = "현재 랜덤 편지 수신 가능 회원 수", example = "27") long availableReceiversCount
) {}
