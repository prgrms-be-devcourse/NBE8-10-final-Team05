package com.back.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("JWT 토큰 서비스 테스트")
class JwtTokenServiceTest {

  private static final String SECRET_KEY =
      "test-secret-key-at-least-32-characters-long-1234567890";

  @Test
  @DisplayName("액세스 토큰 생성 후 파싱하면 사용자 정보가 유지된다")
  void generateAndParseAccessToken() {
    JwtProperties jwtProperties = new JwtProperties("maum-on-test", SECRET_KEY, 3600L);
    JwtTokenService jwtTokenService = new JwtTokenService(jwtProperties);

    String token = jwtTokenService.generateAccessToken(10, "member10@test.com", List.of("ROLE_USER"));
    JwtSubject subject = jwtTokenService.parse(token);

    assertThat(jwtTokenService.validate(token)).isTrue();
    assertThat(subject.memberId()).isEqualTo(10);
    assertThat(subject.email()).isEqualTo("member10@test.com");
    assertThat(subject.roles()).containsExactly("ROLE_USER");
  }

  @Test
  @DisplayName("유효하지 않은 토큰은 validate에서 false를 반환한다")
  void validateReturnsFalseForInvalidToken() {
    JwtProperties jwtProperties = new JwtProperties("maum-on-test", SECRET_KEY, 3600L);
    JwtTokenService jwtTokenService = new JwtTokenService(jwtProperties);

    assertThat(jwtTokenService.validate("invalid-token")).isFalse();
  }
}
