package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Schema(description = "편지 보관함 요약 통계")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LettersStatsRes {
    @Schema(description = "받은 편지 개수", example = "12")
    private long receivedCount;
    @Schema(description = "가장 최근 받은 편지 요약")
    private LetterSummary latestReceivedLetter;
    @Schema(description = "가장 최근 보낸 편지 요약")
    private LetterSummary latestSentLetter;

    @Schema(description = "보관함 상단에 노출되는 편지 요약 정보")
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LetterSummary {
        @Schema(description = "편지 식별자", example = "55")
        private Long id;
        @Schema(description = "편지 제목", example = "오늘 너무 지쳐요")
        private String title;
        @Schema(description = "생성 일시 문자열", example = "2026-04-10 08:40:00")
        private String createdDate;
        @Schema(description = "답장 완료 여부", example = "false")
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
