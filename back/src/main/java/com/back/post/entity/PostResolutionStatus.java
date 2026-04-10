package com.back.post.entity;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@Schema(description = "고민 해결 상태", example = "ONGOING")
public enum PostResolutionStatus {
    ONGOING("고민중"),
    RESOLVED("고민해결");

    private final String description;
}
