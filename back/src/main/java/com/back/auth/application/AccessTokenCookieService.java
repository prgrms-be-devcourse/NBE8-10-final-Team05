package com.back.auth.application;

import com.back.global.security.jwt.JwtProperties;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Access 토큰의 쿠키 발급을 담당하는 서비스. */
@Service
public class AccessTokenCookieService {

  private final JwtProperties jwtProperties;

  public AccessTokenCookieService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  /** access 토큰을 쿠키로 내려준다. */
  public void issueAccessTokenCookie(HttpServletResponse response, String accessToken) {
    ResponseCookie cookie = ResponseCookie.from("accessToken", accessToken)
        .httpOnly(false) // 프론트엔드 JS에서 읽을 수 있어야 함 (필요에 따라)
        .secure(jwtProperties.refreshTokenCookieSecure())
        .path("/")
        .sameSite(jwtProperties.refreshTokenCookieSameSite())
        .maxAge(Duration.ofSeconds(jwtProperties.accessTokenExpireSeconds()))
        .build();

    if (StringUtils.hasText(jwtProperties.refreshTokenCookieDomain())) {
      cookie = ResponseCookie.from("accessToken", accessToken)
          .httpOnly(false)
          .secure(jwtProperties.refreshTokenCookieSecure())
          .path("/")
          .sameSite(jwtProperties.refreshTokenCookieSameSite())
          .maxAge(Duration.ofSeconds(jwtProperties.accessTokenExpireSeconds()))
          .domain(jwtProperties.refreshTokenCookieDomain())
          .build();
    }

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
