package com.back.diary.entity;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Diary extends BaseEntity {

    @Column(nullable = false)
    private Long memberId; // 작성자 식별값

    @Column(nullable = true) // 닉네임을 사용하지 않을 경우 null 허용
    private String nickname;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private String categoryName;

    // 일기장은 기본적으로 비공개(true)로 설정
    @Column(nullable = false)
    private boolean isPrivate = true;

    @Builder
    public Diary(Long memberId, String nickname, String title, String content, String categoryName) {
        this.memberId = memberId;
        this.nickname = (nickname == null) ? "익명" : nickname;
        this.nickname = nickname;
        this.title = title;
        this.content = content;
        this.categoryName = categoryName;
    }
}
