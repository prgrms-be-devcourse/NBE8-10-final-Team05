package com.back.auth.application;

import com.back.global.exception.ServiceException;

/** 인증 API 실패 응답 코드/메시지 규약. */
public enum AuthErrorCode {
  EMAIL_ALREADY_EXISTS("409-1", "Member email already exists."),
  INVALID_EMAIL_OR_PASSWORD("401-2", "Invalid email or password."),
  REFRESH_TOKEN_REQUIRED("401-3", "Refresh token cookie is required."),
  REFRESH_TOKEN_INVALID("401-4", "Refresh token is invalid."),
  REFRESH_TOKEN_REUSE_DETECTED("401-5", "Refresh token reuse detected."),
  OIDC_PROVIDER_NOT_SUPPORTED("400-2", "OIDC provider is not supported."),
  OIDC_REDIRECT_URI_NOT_ALLOWED("400-3", "redirect_uri is not allowed."),
  OIDC_AUTHORIZE_DISABLED("403-4", "OIDC authorize endpoint is disabled."),
  OIDC_STATE_INVALID("401-6", "OIDC state is invalid."),
  OIDC_STATE_EXPIRED("401-7", "OIDC state is expired."),
  OIDC_STATE_REPLAY_DETECTED("401-8", "OIDC state is already used."),
  OIDC_NONCE_MISMATCH("401-9", "OIDC nonce does not match."),
  OIDC_TOKEN_EXCHANGE_FAILED("401-10", "OIDC token exchange failed."),
  OIDC_ID_TOKEN_INVALID("401-11", "OIDC id_token is invalid."),
  SSE_SUBSCRIPTION_TICKET_INVALID("401-12", "SSE subscription ticket is invalid or expired."),
  OIDC_AUTHORIZATION_CODE_REQUIRED("400-4", "OIDC authorization code is required."),
  OIDC_ACCOUNT_LINK_CONFLICT("409-2", "OIDC account link conflict detected."),
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
