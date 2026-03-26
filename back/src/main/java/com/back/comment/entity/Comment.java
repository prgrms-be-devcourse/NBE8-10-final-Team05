package com.back.comment.entity;

import com.back.global.jpa.entity.BaseEntity;
import com.back.member.domain.Member;
import com.back.post.entity.Post;
import jakarta.persistence.*;
import lombok.*;


@Getter
@Entity
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Comment extends BaseEntity {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private Member author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(nullable = false, length = 1000)
    private String content;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;


    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    /**
     * 댓글 내용을 수정합니다.
     *
     * @param content 수정할 댓글 내용
     */
    public void modify(String content){
        this.content = content;
    }

    /**
     * 댓글을 소프트 삭제 상태로 전환하고 표시용 내용을 치환합니다.
     */
    public void markAsDelete(){
        this.deleted = true;
        this.content = "[삭제된 댓글입니다.]";
    }





}
