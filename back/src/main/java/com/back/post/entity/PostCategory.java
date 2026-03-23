package com.back.post.entity;

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
