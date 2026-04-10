package com.back.home.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "홈 화면 공개 통계 응답")
public record HomeStatsResponse(
        @Schema(description = "오늘 등록된 고민 수", example = "18") long todayWorryCount,
        @Schema(description = "오늘 오간 편지 수", example = "42") long todayLetterCount,
        @Schema(description = "오늘 작성된 일기 수", example = "11") long todayDiaryCount
) {}
