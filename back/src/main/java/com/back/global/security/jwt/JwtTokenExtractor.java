package com.back.global.security.jwt;

import java.util.Optional;
import org.springframework.util.StringUtils;

/** Authorization 헤더에서 Bearer 토큰 문자열만 분리하는 유틸리티 클래스. */
public final class JwtTokenExtractor {

  private static final String BEARER_PREFIX = "Bearer ";

  private JwtTokenExtractor() {}

  /** "Bearer {token}" 형식이면 토큰을 반환하고, 아니면 Optional.empty()를 반환한다. */
  public static Optional<String> extractBearerToken(String authorizationHeader) {
    if (!StringUtils.hasText(authorizationHeader)
        || !authorizationHeader.startsWith(BEARER_PREFIX)) {
      return Optional.empty();
    }

    String token = authorizationHeader.substring(BEARER_PREFIX.length()).trim();
    if (!StringUtils.hasText(token)) {
      return Optional.empty();
    }

    return Optional.of(token);
  }
}
