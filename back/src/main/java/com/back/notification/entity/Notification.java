package com.back.notification.entity;

import com.back.global.jpa.entity.BaseEntity;
import com.back.member.domain.Member;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    private Member receiver; // 알림을 받을 사람
    private String content;   // 알림 내용
    private boolean isRead;   // 읽음 여부

    @Builder
    public Notification(Member receiver, String content) {
        this.receiver = receiver;
        this.content = content;
        this.isRead = false;
    }

    public void markAsRead() {
        this.isRead = true;
    }
}