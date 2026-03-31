package com.back.post.entity;

import com.back.global.jpa.entity.BaseEntity;
import com.back.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Post extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String title;

    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false, length = 200)
    private String summary;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PostStatus status = PostStatus.DRAFT;

    @Builder.Default
    private int viewCount = 0;

    private String thumbnail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PostCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PostResolutionStatus resolutionStatus = PostResolutionStatus.ONGOING;

    /**
     * 게시글의 제목, 내용, 요약, 썸네일, 카테고리를 수정합니다.
     *
     * @param title 수정할 제목
     * @param content 수정할 내용
     * @param summary 수정된 본문을 기준으로 생성한 요약문
     * @param thumbnail 수정할 썸네일 URL
     * @param category 수정할 게시글 카테고리
     */
    public void update(
            String title,
            String content,
            String summary,
            String thumbnail,
            PostCategory category
    ) {
        this.title = title;
        this.content = content;
        this.summary = summary;
        this.thumbnail = thumbnail;
        this.category = category;

    }

    /**
     * 게시글의 상태를 변경합니다.
     *
     * @param status 변경할 게시글 상태
     */
    public void updateStatus(PostStatus status) {
        this.status = status;
    }

    /**
     * 게시글의 고민 진행 상태를 변경합니다.
     *
     * @param resolutionStatus 변경할 고민 진행 상태
     */
    public void updateResolutionStatus(PostResolutionStatus resolutionStatus) {
        this.resolutionStatus = resolutionStatus;
    }

}
