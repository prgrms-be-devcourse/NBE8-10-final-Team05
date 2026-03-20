package com.back.auth.application;

import com.back.global.exception.ServiceException;

/** 인증 API 실패 응답 코드/메시지 규약. */
public enum AuthErrorCode {
  EMAIL_ALREADY_EXISTS("409-1", "Member email already exists."),
  INVALID_EMAIL_OR_PASSWORD("401-2", "Invalid email or password."),
  REFRESH_TOKEN_REQUIRED("401-3", "Refresh token cookie is required."),
  REFRESH_TOKEN_INVALID("401-4", "Refresh token is invalid."),
  REFRESH_TOKEN_REUSE_DETECTED("401-5", "Refresh token reuse detected."),
  MEMBER_BLOCKED("403-2", "Member is blocked."),
  MEMBER_WITHDRAWN("403-3", "Member is withdrawn."),
  MEMBER_NOT_FOUND("404-1", "Member not found."),
  AUTHENTICATION_REQUIRED("401-1", "Authentication is required.");

  private final String code;
  private final String message;

  AuthErrorCode(String code, String message) {
    this.code = code;
    this.message = message;
  }

  public String code() {
    return code;
  }

  public String message() {
    return message;
  }

  public ServiceException toException() {
    return new ServiceException(code, message);
  }
}
