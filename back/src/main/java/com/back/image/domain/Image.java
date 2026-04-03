package com.back.image.domain;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "common_image")
public class Image extends BaseEntity {

    @Column(nullable = false)
    private String originName;

    @Column(nullable = false, unique = true)
    private String storedName;

    @Column(nullable = false)
    private String accessUrl;

    private String extension;
    private long fileSize;

    private String referenceType;
    private Long referenceId;

    // 1. 상태 필드 선언 (중복 제거됨)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ImageStatus status = ImageStatus.PENDING;

    // 2. 내부 Enum 선언 (중복 제거됨)
    public enum ImageStatus {
        PENDING,   // 업로드 직후, 아직 도메인과 연결 안 됨
        CONNECTED, // 일기 등 도메인 객체와 연결됨
        DELETED    // 논리적 삭제 상태
    }

    // 3. 비즈니스 로직 메서드 (중복 제거됨)

    // 도메인 연결 메서드
    public void connectTo(String refType, Long refId) {
        this.referenceType = refType;
        this.referenceId = refId;
        this.status = ImageStatus.CONNECTED;
    }

    // 논리 삭제 메서드
    public void softDelete() {
        this.status = ImageStatus.DELETED;
    }
}
