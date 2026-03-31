package com.back.consultation.domain;

import com.back.global.jpa.entity.BaseEntity;
import com.back.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Consultation extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", unique = true) // 1계정 1AI
    private Member member;

    public static Consultation create(Member member) {
        return Consultation.builder()
                .member(member)
                .build();
    }
}