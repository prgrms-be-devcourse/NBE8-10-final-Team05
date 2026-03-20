package com.back.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("JWT 토큰 서비스 테스트")
class JwtTokenServiceTest {

  private static final String SECRET_KEY = "test-secret-key-at-least-32-characters-long-1234567890";

  @Test
  @DisplayName("액세스 토큰 생성 후 파싱하면 사용자 정보가 유지된다")
  void generateAndParseAccessToken() {
    JwtProperties jwtProperties =
        new JwtProperties(
            "maum-on-test", SECRET_KEY, 3600L, 1_209_600L, "refreshToken", false, "Lax");
    JwtTokenService jwtTokenService = new JwtTokenService(jwtProperties);

    String token =
        jwtTokenService.generateAccessToken(10, "member10@test.com", List.of("ROLE_USER"));
    JwtSubject subject = jwtTokenService.parse(token);

    assertThat(jwtTokenService.validate(token)).isTrue();
    assertThat(subject.memberId()).isEqualTo(10);
    assertThat(subject.email()).isEqualTo("member10@test.com");
    assertThat(subject.roles()).containsExactly("ROLE_USER");
  }

  @Test
  @DisplayName("유효하지 않은 토큰은 validate에서 false를 반환한다")
  void validateReturnsFalseForInvalidToken() {
    JwtProperties jwtProperties =
        new JwtProperties(
            "maum-on-test", SECRET_KEY, 3600L, 1_209_600L, "refreshToken", false, "Lax");
    JwtTokenService jwtTokenService = new JwtTokenService(jwtProperties);

    assertThat(jwtTokenService.validate("invalid-token")).isFalse();
  }

  @Test
  @DisplayName("리프레시 토큰 생성 후 파싱하면 jti와 familyId가 유지된다")
  void generateAndParseRefreshToken() {
    JwtProperties jwtProperties =
        new JwtProperties(
            "maum-on-test", SECRET_KEY, 3600L, 1_209_600L, "refreshToken", false, "Lax");
    JwtTokenService jwtTokenService = new JwtTokenService(jwtProperties);

    String token = jwtTokenService.generateRefreshToken(11, "jti-11", "family-11");
    JwtRefreshSubject refreshSubject = jwtTokenService.parseRefreshToken(token);

    assertThat(jwtTokenService.validate(token)).isTrue();
    assertThat(refreshSubject.memberId()).isEqualTo(11);
    assertThat(refreshSubject.jti()).isEqualTo("jti-11");
    assertThat(refreshSubject.familyId()).isEqualTo("family-11");
  }

  @Test
  @DisplayName("만료된 액세스 토큰은 validate에서 false를 반환하고 파싱에 실패한다")
  void expiredAccessTokenReturnsFalseOnValidate() {
    JwtProperties jwtProperties =
        new JwtProperties(
            "maum-on-test", SECRET_KEY, 3600L, 1_209_600L, "refreshToken", false, "Lax");
    JwtTokenService jwtTokenService = new JwtTokenService(jwtProperties);
    Instant now = Instant.now();

    String expiredToken =
        Jwts.builder()
            .issuer("maum-on-test")
            .subject("12")
            .claim("tokenType", "access")
            .claim("email", "member12@test.com")
            .claim("roles", List.of("ROLE_USER"))
            .issuedAt(Date.from(now.minusSeconds(120)))
            .expiration(Date.from(now.minusSeconds(1)))
            .signWith(Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8)))
            .compact();

    assertThat(jwtTokenService.validate(expiredToken)).isFalse();
    assertThatThrownBy(() -> jwtTokenService.parseAccessToken(expiredToken))
        .isInstanceOf(JwtException.class);
  }
}
