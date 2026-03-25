package com.back.diary.domain;

import com.back.global.jpa.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    private String imageUrl;
    private String newImageUrl;

    @JsonProperty("isPrivate")
    private boolean isPrivate = true;


    public void updateImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }


    @Builder
    public Diary(Long memberId, String nickname, String title, String content,String imageUrl, String categoryName, boolean isPrivate) {
        this.memberId = memberId;
        this.nickname = (nickname == null) ? "익명" : nickname;
        this.title = title;
        this.content = content;
        this.categoryName = categoryName;
        this.imageUrl = imageUrl;
        this.isPrivate = isPrivate;
    }

    public void modify(String title, String content,String newImageUrl, String categoryName,boolean isPrivate) {
        this.title = title;
        this.content = content;
        this.newImageUrl = newImageUrl;
        this.categoryName = categoryName;
        this.isPrivate = isPrivate;
    }


}
