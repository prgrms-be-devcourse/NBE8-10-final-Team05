package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.back.global.security.jwt.JwtProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;

@DisplayName("리프레시 쿠키 서비스 테스트")
class RefreshTokenCookieServiceTest {

  @Test
  @DisplayName("운영 설정에서는 Secure와 SameSite=None 속성으로 쿠키를 발급한다")
  void issueCookieUsesProdPolicy() {
    JwtProperties properties =
        new JwtProperties(
            "maum-on-test",
            "maum-on-test-secret-key-at-least-32-characters-long-123456",
            3600L,
            1_209_600L,
            "refreshToken",
            true,
            "None");
    RefreshTokenCookieService service = new RefreshTokenCookieService(properties);
    MockHttpServletResponse response = new MockHttpServletResponse();

    service.issueRefreshTokenCookie(response, "raw-refresh-token");

    String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
    assertThat(setCookie).contains("refreshToken=raw-refresh-token");
    assertThat(setCookie).contains("Secure");
    assertThat(setCookie).contains("HttpOnly");
    assertThat(setCookie).contains("SameSite=None");
  }

  @Test
  @DisplayName("개발 설정에서는 Secure 미사용과 SameSite=Lax 속성으로 쿠키를 발급한다")
  void issueCookieUsesDevPolicy() {
    JwtProperties properties =
        new JwtProperties(
            "maum-on-test",
            "maum-on-test-secret-key-at-least-32-characters-long-123456",
            3600L,
            1_209_600L,
            "refreshToken",
            false,
            "Lax");
    RefreshTokenCookieService service = new RefreshTokenCookieService(properties);
    MockHttpServletResponse response = new MockHttpServletResponse();

    service.issueRefreshTokenCookie(response, "raw-refresh-token");

    String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
    assertThat(setCookie).contains("refreshToken=raw-refresh-token");
    assertThat(setCookie).contains("HttpOnly");
    assertThat(setCookie).contains("SameSite=Lax");
    assertThat(setCookie).doesNotContain("Secure");
  }
}
