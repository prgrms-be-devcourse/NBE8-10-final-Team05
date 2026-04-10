package com.back.post.entity;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "게시글 카테고리", example = "WORRY")
public  enum  PostCategory {

    DAILY("일상"),
    WORRY("고민"),
    QUESTION("질문");

    private final String label;

    PostCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

}
