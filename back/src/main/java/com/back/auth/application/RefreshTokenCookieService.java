package com.back.auth.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.back.global.security.jwt.JwtProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** refresh 토큰의 HttpOnly 쿠키 읽기/쓰기 규칙을 담당하는 서비스. */
@Service
public class RefreshTokenCookieService {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private final JwtProperties jwtProperties;

  public RefreshTokenCookieService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  /** 요청 쿠키에서 refresh 토큰 값을 추출한다. */
  public Optional<String> resolveRefreshToken(HttpServletRequest request) {
    String rawCookieHeader = request.getHeader(HttpHeaders.COOKIE);
    if (StringUtils.hasText(rawCookieHeader)) {
      List<String> refreshTokens =
          Arrays.stream(rawCookieHeader.split(";"))
              .map(String::trim)
              .filter(StringUtils::hasText)
              .map(this::parseCookieEntry)
              .flatMap(Optional::stream)
              .filter(entry -> jwtProperties.refreshTokenCookieName().equals(entry.name()))
              .map(CookieEntry::value)
              .filter(StringUtils::hasText)
              .toList();

      if (!refreshTokens.isEmpty()) {
        return Optional.of(selectMostRecentRefreshToken(refreshTokens));
      }
    }

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

  private Optional<CookieEntry> parseCookieEntry(String cookieEntry) {
    int separatorIndex = cookieEntry.indexOf('=');
    if (separatorIndex <= 0) {
      return Optional.empty();
    }

    String name = cookieEntry.substring(0, separatorIndex).trim();
    String value = cookieEntry.substring(separatorIndex + 1).trim();
    if (!StringUtils.hasText(name) || !StringUtils.hasText(value)) {
      return Optional.empty();
    }

    return Optional.of(new CookieEntry(name, value));
  }

  private String selectMostRecentRefreshToken(List<String> refreshTokens) {
    return refreshTokens.stream()
        .map(
            token ->
                new RefreshTokenCandidate(
                    token, readNumericClaim(token, "iat"), readNumericClaim(token, "exp")))
        .max(
            Comparator.comparingLong(RefreshTokenCandidate::issuedAt)
                .thenComparingLong(RefreshTokenCandidate::expiresAt))
        .map(RefreshTokenCandidate::token)
        .orElse(refreshTokens.get(refreshTokens.size() - 1));
  }

  private long readNumericClaim(String token, String claimName) {
    String[] parts = token.split("\\.");
    if (parts.length < 2) {
      return Long.MIN_VALUE;
    }

    try {
      byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
      Map<String, Object> payload =
          OBJECT_MAPPER.readValue(decoded, new TypeReference<Map<String, Object>>() {});
      Object claimValue = payload.get(claimName);
      if (claimValue instanceof Number number) {
        return number.longValue();
      }
    } catch (Exception ignored) {
      // ignore malformed token payloads and keep fallback ordering
    }

    return Long.MIN_VALUE;
  }

  private record CookieEntry(String name, String value) {}

  private record RefreshTokenCandidate(String token, long issuedAt, long expiresAt) {}
}
