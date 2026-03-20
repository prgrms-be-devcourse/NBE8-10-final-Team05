package com.back.post.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;


@Getter
@RequiredArgsConstructor
public enum PostStatus {
    DRAFT("임시 저장"),
    PUBLISHED("발행됨"),
    HIDDEN("숨김 처리");

    private final String description;
}
