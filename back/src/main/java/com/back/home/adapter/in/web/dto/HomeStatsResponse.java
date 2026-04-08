package com.back.home.adapter.in.web.dto;

public record HomeStatsResponse(
        long todayWorryCount,
        long todayLetterCount,
        long todayDiaryCount
) {}
