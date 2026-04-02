package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

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

        public static LetterSummary from(Letter letter, boolean replied) {
            if (letter == null) return null;

            return LetterSummary.builder()
                    .id(letter.getId())
                    .title(letter.getTitle())
                    .createdDate(letter.getCreateDate() != null
                            ? letter.getCreateDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                            : null)
                    .replied(replied)
                    .build();
        }
    }
}
