package com.back.letter.domain;


import com.back.global.jpa.entity.BaseEntity;
import com.back.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;
import com.back.global.exception.ServiceException;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Letter extends BaseEntity {

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String replyContent;

    @Column(columnDefinition = "TEXT")
    private String replySummary;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private Member sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id")
    private Member receiver;

    private LocalDateTime replyCreatedDate;

    @Enumerated(EnumType.STRING)
    private LetterStatus status;




    /**
     * 편지 최초 발송 (수신자 할당 및 상태 변경)
     */
    public void dispatch(Member receiver) {
        if (this.status != null) {
            throw new ServiceException("400-1", "이미 처리된 편지입니다.");
        }
        this.receiver = receiver;
        this.status = LetterStatus.SENT;
    }

    /**
     * 수신자가 편지를 읽음 (수락)
     */
    public void accept(long accessorId) {
        verifyReceiver(accessorId);

        if (this.status == LetterStatus.SENT) {
            this.status = LetterStatus.ACCEPTED;
        }
    }

    /**
     * 수신자가 편지를 거절
     */
    public void reject(long accessorId) {
        verifyReceiver(accessorId);

        if (this.status != LetterStatus.SENT) {
            throw new ServiceException("400-3", "대기 중인 편지만 거절할 수 있습니다.");
        }

        this.receiver = null;
        this.status = null;
    }

    /**
     * 답장 작성 완료
     */
    public void reply(String replyContent, String replySummary, long accessorId) {
        verifyReceiver(accessorId);

        if (this.status == LetterStatus.REPLIED) {
            throw new ServiceException("400-2", "이미 답장이 완료된 편지입니다.");
        }

        this.replyContent = replyContent;
        this.replySummary = replySummary;
        this.status = LetterStatus.REPLIED;
        this.replyCreatedDate = LocalDateTime.now();
    }

    /**
     * 수신자 재할당 (재매칭 스케줄러용)
     */
    public void reassignReceiver(Member newReceiver) {
        if (this.status != LetterStatus.SENT) {
            throw new ServiceException("400-3", "대기 중인 편지만 재할당이 가능합니다.");
        }
        this.receiver = newReceiver;
    }

    public void adminReassign(Member newReceiver) {
        if (this.status == LetterStatus.REPLIED) {
            throw new ServiceException("400-3", "답장이 완료된 편지는 재배정할 수 없습니다.");
        }

        this.receiver = newReceiver;
        this.status = LetterStatus.SENT;
    }

    /**
     * 권한 검증 내부 헬퍼 메서드
     */
    private void verifyReceiver(long accessorId) {
        if (this.receiver == null || !this.receiver.getId().equals(accessorId)) {
            throw new ServiceException("403-2", "해당 편지에 대한 권한이 없습니다.");
        }
    }
}
