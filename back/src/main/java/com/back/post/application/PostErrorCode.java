package com.back.post.application;

import com.back.global.exception.ServiceException;

public enum PostErrorCode {
  POST_NOT_FOUND("404-1", "존재하지 않는 게시물 입니다."),
  FORBIDDEN("403-1", "You do not have permission.");

  private final String code;
  private final String message;

  PostErrorCode(String code, String message) {
    this.code = code;
    this.message = message;
  }

  public ServiceException toException() {
    return new ServiceException(code, message);
  }
}
