package com.back.domain.letter.entity;


import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Letter extends BaseEntity {

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String replyContent;

    private String status;

    private String senderId;
    private String receiverId;

    private LocalDateTime replyCreatedDate;


    public Letter(String title, String content){
        this.title = title;
        this.content = content;
        this.status = "SENT";
    }

    public void reply(String replyContent){
        this.replyContent = replyContent;
        this.status = "REPLIED";
        this.replyCreatedDate = LocalDateTime.now();
    }


}
