package com.back.global.exception;

public class PostException extends ServiceException {

  public PostException(String resultCode, String msg) {
    super(resultCode, msg);
  }
}
