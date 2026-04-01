package com.back.consultation.domain;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    private Consultation consultation;

    @Enumerated(EnumType.STRING)
    private MessageRole role; // USER, ASSISTANT

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    public static ChatMessage create(Consultation consultation, MessageRole role, String content) {
        return ChatMessage.builder()
                .consultation(consultation)
                .role(role)
                .content(content)
                .build();
    }
}