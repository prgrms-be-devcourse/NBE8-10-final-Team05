package com.back.post.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PostResolutionStatus {
    ONGOING("고민중"),
    RESOLVED("고민해결");

    private final String description;
}
