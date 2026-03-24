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


    public void update(String title, String content, String thumbnail, PostCategory category) {
        this.title = title;
        this.content = content;
        this.thumbnail = thumbnail;
        this.category = category;

    }

    //게시글의 상태(DRAFT, PUBLISHED, HIDDEN)를 변경합니다.
    public void updateStatus(PostStatus status) {
        this.status = status;
    }

}
