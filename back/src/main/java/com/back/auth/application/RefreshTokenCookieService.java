package com.back.auth.application;

import com.back.global.security.jwt.JwtProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** refresh 토큰의 HttpOnly 쿠키 읽기/쓰기 규칙을 담당하는 서비스. */
@Service
public class RefreshTokenCookieService {

  private final JwtProperties jwtProperties;

  public RefreshTokenCookieService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  /** 요청 쿠키에서 refresh 토큰 값을 추출한다. */
  public Optional<String> resolveRefreshToken(HttpServletRequest request) {
    if (request.getCookies() == null) {
      return Optional.empty();
    }

    return Arrays.stream(request.getCookies())
        .filter(cookie -> jwtProperties.refreshTokenCookieName().equals(cookie.getName()))
        .map(Cookie::getValue)
        .filter(StringUtils::hasText)
        .findFirst();
  }

  /** refresh 토큰을 HttpOnly 쿠키로 내려준다. */
  public void issueRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
    addSetCookieHeader(
        response,
        buildRefreshCookie(
            refreshToken, Duration.ofSeconds(jwtProperties.refreshTokenExpireSeconds())));
  }

  /** refresh 쿠키를 즉시 만료시켜 로그아웃 상태를 만든다. */
  public void expireRefreshTokenCookie(HttpServletResponse response) {
    addSetCookieHeader(response, buildRefreshCookie("", Duration.ZERO));
  }

  private ResponseCookie buildRefreshCookie(String value, Duration maxAge) {
    ResponseCookie.ResponseCookieBuilder builder =
        ResponseCookie.from(jwtProperties.refreshTokenCookieName(), value)
            .httpOnly(true)
            .secure(jwtProperties.refreshTokenCookieSecure())
            .path("/")
            .sameSite(jwtProperties.refreshTokenCookieSameSite())
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
