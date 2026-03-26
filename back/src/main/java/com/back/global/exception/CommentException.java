package com.back.global.exception;

public class CommentException extends ServiceException {

  public CommentException(String resultCode, String msg) {
    super(resultCode, msg);
  }
}
