package com.back.auth.application;

/** 인증 API 성공 응답 코드/메시지 규약. */
public enum AuthSuccessCode {
  SIGNUP_SUCCESS("201-2", "Signed up successfully."),
  LOGIN_SUCCESS("200-3", "Logged in successfully."),
  REFRESH_SUCCESS("200-4", "Token refreshed successfully."),
  SESSION_SUCCESS("200-7", "Session validated successfully."),
  LOGOUT_SUCCESS("200-5", "Logged out successfully."),
  ME_SUCCESS("200-6", "Current member fetched.");

  private final String code;
  private final String message;

  AuthSuccessCode(String code, String message) {
    this.code = code;
    this.message = message;
  }

  public String code() {
    return code;
  }

  public String message() {
    return message;
  }
}
