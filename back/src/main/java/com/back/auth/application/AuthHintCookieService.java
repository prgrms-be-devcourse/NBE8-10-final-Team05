package com.back.auth.application;

import com.back.global.security.jwt.JwtProperties;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** 프론트 SSR/미들웨어가 읽는 인증 힌트 쿠키를 발급/만료한다. */
@Service
public class AuthHintCookieService {

  static final String AUTH_HINT_COOKIE_NAME = "maumOnAuthHint";
  private static final String AUTH_HINT_MEMBER = "member";
  private static final String AUTH_HINT_ADMIN = "admin";
  private static final String AUTH_HINT_SAME_SITE = "Lax";

  private final JwtProperties jwtProperties;

  public AuthHintCookieService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  /** 회원 role에 맞는 인증 힌트 쿠키를 내려준다. */
  public void issueAuthenticatedHintCookie(HttpServletResponse response, String role) {
    String value = "ADMIN".equalsIgnoreCase(role) ? AUTH_HINT_ADMIN : AUTH_HINT_MEMBER;
    addSetCookieHeader(
        response,
        buildAuthHintCookie(
            value, Duration.ofSeconds(jwtProperties.refreshTokenExpireSeconds())));
  }

  /** 인증 힌트 쿠키를 즉시 만료시킨다. */
  public void expireAuthHintCookie(HttpServletResponse response) {
    addSetCookieHeader(response, buildAuthHintCookie("", Duration.ZERO));
  }

  private ResponseCookie buildAuthHintCookie(String value, Duration maxAge) {
    ResponseCookie.ResponseCookieBuilder builder =
        ResponseCookie.from(AUTH_HINT_COOKIE_NAME, value)
            .httpOnly(false)
            .secure(jwtProperties.refreshTokenCookieSecure())
            .path("/")
            .sameSite(AUTH_HINT_SAME_SITE)
            .maxAge(maxAge);

    if (StringUtils.hasText(jwtProperties.refreshTokenCookieDomain())) {
      builder.domain(jwtProperties.refreshTokenCookieDomain());
    }

    return builder.build();
  }

  private void addSetCookieHeader(HttpServletResponse response, ResponseCookie cookie) {
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
