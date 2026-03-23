package com.back.report.entity;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Table(name = "reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Report extends BaseEntity {

    @Column(nullable = false)
    private Long reporterId; // 신고자 ID

    @Column(nullable = false)
    private Long targetId;      // 신고 대상 ID

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TargetType targetType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportReason reason;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    public static Report create(Long reporterId, Long targetId, TargetType targetType,
                                ReportReason reason, String content) {
        return Report.builder()
                .reporterId(reporterId)
                .targetId(targetId)
                .targetType(targetType)
                .reason(reason)
                .content(content)
                .build();
    }
}