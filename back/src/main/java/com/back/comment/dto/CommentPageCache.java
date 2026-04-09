package com.back.comment.dto;

import java.util.List;

public record CommentPageCache(
    List<CommentInfoRes> content,
    boolean hasNext
) {}
