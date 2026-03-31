package com.back.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("JWT 설정 프로퍼티 테스트")
class JwtPropertiesTest {

  @Test
  @DisplayName("secretKey가 비어 있으면 예외가 발생한다")
  void throwsWhenSecretKeyIsBlank() {
    assertThatThrownBy(
            () ->
                new JwtProperties("maum-on", " ", 3600L, 1_209_600L, "refreshToken", false, "Lax"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("custom.jwt.secret-key must not be blank.");
  }

  @Test
  @DisplayName("sameSite 값은 대소문자와 무관하게 표준 값으로 정규화된다")
  void normalizesSameSiteValue() {
    JwtProperties properties =
        new JwtProperties(
            "maum-on",
            "maum-on-test-secret-key-at-least-32-characters-long-123456",
            3600L,
            1_209_600L,
            "refreshToken",
            true,
            "none");

    assertThat(properties.refreshTokenCookieSameSite()).isEqualTo("None");
  }

  @Test
  @DisplayName("지원하지 않는 sameSite 값은 예외가 발생한다")
  void throwsWhenSameSiteIsUnsupported() {
    assertThatThrownBy(
            () ->
                new JwtProperties(
                    "maum-on",
                    "maum-on-test-secret-key-at-least-32-characters-long-123456",
                    3600L,
                    1_209_600L,
                    "refreshToken",
                    true,
                    "invalid"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("custom.jwt.refresh-token-cookie-same-site must be one of");
  }
}
