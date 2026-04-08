package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.back.global.security.jwt.JwtProperties;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@DisplayName("리프레시 쿠키 서비스 테스트")
class RefreshTokenCookieServiceTest {

  private static String createFakeJwt(long issuedAt, long expiresAt) {
    String payload =
        String.format("{\"iat\":%d,\"exp\":%d}", issuedAt, expiresAt);
    return "header." + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes()) + ".signature";
  }

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
            null,
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
            null,
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

  @Test
  @DisplayName("요청 쿠키에서 refresh 토큰을 정상 추출한다")
  void resolveRefreshTokenFromRequestCookie() {
    JwtProperties properties =
        new JwtProperties(
            "maum-on-test",
            "maum-on-test-secret-key-at-least-32-characters-long-123456",
            3600L,
            1_209_600L,
            "refreshToken",
            null,
            false,
            "Lax");
    RefreshTokenCookieService service = new RefreshTokenCookieService(properties);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setCookies(new Cookie("refreshToken", "raw-refresh-token"), new Cookie("other", "value"));

    var result = service.resolveRefreshToken(request);

    assertThat(result).contains("raw-refresh-token");
  }

  @Test
  @DisplayName("중복 refreshToken 쿠키가 있으면 최신 iat 값을 우선 사용한다")
  void resolveMostRecentRefreshTokenFromRawCookieHeader() {
    JwtProperties properties =
        new JwtProperties(
            "maum-on-test",
            "maum-on-test-secret-key-at-least-32-characters-long-123456",
            3600L,
            1_209_600L,
            "refreshToken",
            null,
            false,
            "Lax");
    RefreshTokenCookieService service = new RefreshTokenCookieService(properties);
    MockHttpServletRequest request = new MockHttpServletRequest();
    String olderRefreshToken = createFakeJwt(100L, 200L);
    String newerRefreshToken = createFakeJwt(300L, 400L);
    request.addHeader(
        HttpHeaders.COOKIE,
        "refreshToken="
            + olderRefreshToken
            + "; JSESSIONID=test-session; refreshToken="
            + newerRefreshToken);

    var result = service.resolveRefreshToken(request);

    assertThat(result).contains(newerRefreshToken);
  }

  @Test
  @DisplayName("로그아웃 시 refresh 쿠키를 즉시 만료시킨다")
  void expireRefreshTokenCookieImmediately() {
    JwtProperties properties =
        new JwtProperties(
            "maum-on-test",
            "maum-on-test-secret-key-at-least-32-characters-long-123456",
            3600L,
            1_209_600L,
            "refreshToken",
            null,
            false,
            "Lax");
    RefreshTokenCookieService service = new RefreshTokenCookieService(properties);
    MockHttpServletResponse response = new MockHttpServletResponse();

    service.expireRefreshTokenCookie(response);

    String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
    assertThat(setCookie).contains("refreshToken=");
    assertThat(setCookie).contains("Max-Age=0");
  }
  @Test
  @DisplayName("공유 서브도메인 배포에서는 Domain 속성으로 refresh 쿠키를 발급한다")
  void issueCookieIncludesConfiguredDomain() {
    JwtProperties properties =
        new JwtProperties(
            "maum-on-test",
            "maum-on-test-secret-key-at-least-32-characters-long-123456",
            3600L,
            1_209_600L,
            "refreshToken",
            ".example.com",
            true,
            "None");
    RefreshTokenCookieService service = new RefreshTokenCookieService(properties);
    MockHttpServletResponse response = new MockHttpServletResponse();

    service.issueRefreshTokenCookie(response, "raw-refresh-token");

    String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
    assertThat(setCookie).contains("Domain=.example.com");
  }
}
