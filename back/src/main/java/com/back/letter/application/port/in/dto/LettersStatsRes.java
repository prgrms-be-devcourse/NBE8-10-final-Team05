package com.back.letter.application.port.in.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LettersStatsRes {
    private long receivedCount;
    private LetterSummary latestReceivedLetter;
    private LetterSummary latestSentLetter;

    @Getter
    @Builder
    public static class LetterSummary {
        private Long id;
        private String title;
        private String createdDate;
        private boolean replied;
    }
}
