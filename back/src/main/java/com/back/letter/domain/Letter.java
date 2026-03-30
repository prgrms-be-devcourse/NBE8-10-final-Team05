package com.back.letter.domain;


import com.back.global.jpa.entity.BaseEntity;
import com.back.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;

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
    private String replyContent;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private Member sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id")
    private Member receiver;

    private LocalDateTime replyCreatedDate;

    @Enumerated(EnumType.STRING)
    private LetterStatus status;


    public void reply(String replyContent){
        this.replyContent = replyContent;
        this.status = LetterStatus.REPLIED;
        this.replyCreatedDate = LocalDateTime.now();
    }

    public void setStatus(LetterStatus status) {
        this.status = status;
    }

    public void reassignReceiver(Member newReceiver) {
        this.receiver = newReceiver;
        this.setCreateDate(LocalDateTime.now()); // 생성일 갱신 옵션
        this.status = LetterStatus.SENT;
    }

}
