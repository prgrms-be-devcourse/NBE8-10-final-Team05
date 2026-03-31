package com.back.letter.application.port.in.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LettersStatsRes {
    private long receivedCount;
    private LetterSummary latestReceivedLetter;
    private LetterSummary latestSentLetter;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LetterSummary {
        private Long id;
        private String title;
        private String createdDate;
        private boolean replied;
    }
}
