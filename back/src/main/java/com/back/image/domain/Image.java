package com.back.image.domain;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
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

    public void connectTo(String refType, Long refId) {
        this.referenceType = refType;
        this.referenceId = refId;
    }
}
