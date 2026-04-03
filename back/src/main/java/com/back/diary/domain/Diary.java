package com.back.diary.domain;

import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.global.exception.ServiceException;
import com.back.global.jpa.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Diary extends BaseEntity {

    @Column(nullable = false)
    private Long memberId; // 작성자 식별값

    @Column(nullable = true)
    private String nickname;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private String categoryName;

    private String imageUrl;

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

    public static Diary create(Long memberId, String nickname, String title, String content,
                               String categoryName, String imageUrl, boolean isPrivate) {
        String finalNickname = (nickname == null || nickname.isBlank()) ? "익명" : nickname;

        return Diary.builder()
                .memberId(memberId)
                .nickname(finalNickname)
                .title(title)
                .content(content)
                .categoryName(categoryName)
                .imageUrl(imageUrl)
                .isPrivate(isPrivate)
                .build();
    }

    public void modify(String title, String content,String newImageUrl, String categoryName,boolean isPrivate) {
        this.title = title;
        this.content = content;
        this.categoryName = categoryName;
        this.imageUrl  = newImageUrl;
        this.isPrivate = isPrivate;
    }

    public void updateRepresentativeImage(String uploadedUrl, String requestUrl, List<String> extractedUrls) {
        if (uploadedUrl != null) {
            this.imageUrl = uploadedUrl;
        } else if (requestUrl != null && !requestUrl.isBlank()) {
            this.imageUrl = requestUrl;
        } else if (!extractedUrls.isEmpty()) {
            this.imageUrl = extractedUrls.get(0);
        } else {
            this.imageUrl = null;
        }
    }

    public void validateOwner(Long currentMemberId) {
        if (!this.memberId.equals(currentMemberId)) {
            throw new ServiceException("403-1", "해당 일기에 대한 권한이 없습니다.");
        }
    }

    public void validateAccess(Long currentMemberId) {
        if (this.isPrivate && (currentMemberId == null || !this.memberId.equals(currentMemberId))) {
            throw new ServiceException("403-1", "비공개 일기입니다. 접근 권한이 없습니다.");
        }
    }

    public void modify(DiaryCreateReq req, String newImageUrl) {
        // 상태 변경 로직만 집중
        this.title = req.title();
        this.content = req.content();
        this.categoryName = req.categoryName();
        this.imageUrl = newImageUrl;
        this.isPrivate = req.isPrivate();
    }

    public boolean isImageChanged(String requestImageUrl) {
        if (this.imageUrl == null) return requestImageUrl != null;
        return !this.imageUrl.equals(requestImageUrl);
    }


}
