package com.back.letter.entity;


import com.back.global.jpa.entity.BaseEntity;
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

    private String senderId;
    private String receiverId;

    private LocalDateTime replyCreatedDate;

    @Enumerated(EnumType.STRING)
    private LetterStatus status;


    public void reply(String replyContent){
        this.replyContent = replyContent;
        this.status = LetterStatus.REPLIED;
        this.replyCreatedDate = LocalDateTime.now();
    }


}
