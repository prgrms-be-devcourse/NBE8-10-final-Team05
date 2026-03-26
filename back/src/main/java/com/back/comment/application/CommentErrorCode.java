package com.back.comment.application;

import com.back.global.exception.CommentException;

public enum CommentErrorCode {
  CONTENT_BLANK("400-1", "내용을 입력해주세요."),
  COMMENT_NOT_FOUND("404-2", "부모 댓글이 존재하지 않습니다."),
  INVALID_PARENT_COMMENT("400-2", "해당 게시물의 댓글이 아닙니다."),
  FORBIDDEN("403-1", "댓글을 수정하거나 삭제할 권한이 없습니다."),
  COMMENT_ALREADY_DELETED("400-3", "이미 삭제된 댓글입니다."),
  PARENT_COMMENT_DELETED("400-4", "삭제된 댓글에는 답글을 작성할 수 없습니다.");

  private final String code;
  private final String message;

  CommentErrorCode(String code, String message) {
    this.code = code;
    this.message = message;
  }

  public CommentException toException() {
    return new CommentException(code, message);
  }
}
