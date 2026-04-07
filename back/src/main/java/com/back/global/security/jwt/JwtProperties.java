package com.back.global.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** application.yaml의 custom.jwt 설정을 바인딩하는 값 객체. */
@ConfigurationProperties(prefix = "custom.jwt")
public record JwtProperties(
    String issuer,
    String secretKey,
    long accessTokenExpireSeconds,
    long refreshTokenExpireSeconds,
    String refreshTokenCookieName,
    String refreshTokenCookieDomain,
    boolean refreshTokenCookieSecure,
    String refreshTokenCookieSameSite) {

  private static final long DEFAULT_REFRESH_TOKEN_EXPIRE_SECONDS = 604_800L; // 7 days

  /** 설정값 기본치 보정과 유효성 검증을 수행한다. */
  public JwtProperties {
    if (issuer == null || issuer.isBlank()) {
      issuer = "maum-on";
    }

    if (secretKey == null || secretKey.isBlank()) {
      throw new IllegalArgumentException("custom.jwt.secret-key must not be blank.");
    }

    if (secretKey.length() < 32) {
      throw new IllegalArgumentException("custom.jwt.secret-key must be at least 32 characters.");
    }

    if (accessTokenExpireSeconds <= 0) {
      accessTokenExpireSeconds = 3600L;
    }

    if (refreshTokenExpireSeconds <= 0) {
      refreshTokenExpireSeconds = DEFAULT_REFRESH_TOKEN_EXPIRE_SECONDS;
    }

    if (refreshTokenCookieName == null || refreshTokenCookieName.isBlank()) {
      refreshTokenCookieName = "refreshToken";
    }

    if (refreshTokenCookieDomain != null) {
      String normalizedDomain = refreshTokenCookieDomain.trim();
      refreshTokenCookieDomain = normalizedDomain.isEmpty() ? null : normalizedDomain;
    }

    if (refreshTokenCookieSameSite == null || refreshTokenCookieSameSite.isBlank()) {
      refreshTokenCookieSameSite = "Lax";
    } else {
      String normalized = refreshTokenCookieSameSite.trim();
      if ("none".equalsIgnoreCase(normalized)) {
        refreshTokenCookieSameSite = "None";
      } else if ("lax".equalsIgnoreCase(normalized)) {
        refreshTokenCookieSameSite = "Lax";
      } else if ("strict".equalsIgnoreCase(normalized)) {
        refreshTokenCookieSameSite = "Strict";
      } else {
        throw new IllegalArgumentException(
            "custom.jwt.refresh-token-cookie-same-site must be one of None, Lax, Strict.");
      }
    }
  }
}
