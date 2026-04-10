package com.back.letter.application.port.in.dto;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "편지 상세 응답")
public record LetterInfoRes(
        @Schema(description = "편지 식별자", example = "55") long id,
        @Schema(description = "편지 제목", example = "오늘 너무 지쳐요") String title,
        @Schema(description = "편지 본문", example = "누군가 제 이야기를 들어줬으면 좋겠어요.") String content,
        @Schema(description = "답장 본문", example = "당신 잘하고 있어요. 오늘은 조금만 쉬어도 괜찮아요.") String replyContent,
        @Schema(description = "편지 상태", implementation = LetterStatus.class, example = "REPLIED") LetterStatus status,
        @Schema(description = "답장 완료 여부", example = "true") boolean replied,
        @Schema(description = "편지 생성 시각", example = "2026-04-10T08:40:00") LocalDateTime createdDate,
        @Schema(description = "답장 생성 시각", example = "2026-04-10T09:15:00") LocalDateTime replyCreatedDate
) {
    public static LetterInfoRes from(Letter letter){
        return new LetterInfoRes(
                letter.getId(),
                letter.getTitle(),
                letter.getContent(),
                letter.getReplyContent(),
                letter.getStatus(),
                letter.getStatus() == LetterStatus.REPLIED,
                letter.getCreateDate(),
                letter.getReplyCreatedDate()
        );
    }
}
