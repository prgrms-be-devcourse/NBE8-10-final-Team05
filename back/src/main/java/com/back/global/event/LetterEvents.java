package com.back.global.event;

public class LetterEvents {

    // 편지 최초 발송 시 발생
    public record LetterSentEvent(
            Long letterId,
            Long receiverId
    ) {}

    // 답장 완료 시 발생
    public record LetterRepliedEvent(
            Long letterId,
            Long senderId,
            Long receiverId
    ) {}

    // (추가 제안) 편지 수락(읽음) 시 발생
    public record LetterAcceptedEvent(
            Long letterId,
            Long senderId
    ) {}

    public record LetterWritingEvent(long letterId, long receiverId) {}
}
