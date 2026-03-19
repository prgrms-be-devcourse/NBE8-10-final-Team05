package com.back.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** JWT 생성, 검증, 클레임 파싱을 담당하는 서비스. */
@Service
public class JwtTokenService {

  private static final String CLAIM_TOKEN_TYPE = "tokenType";
  private static final String CLAIM_FAMILY_ID = "familyId";
  private static final String TOKEN_TYPE_ACCESS = "access";
  private static final String TOKEN_TYPE_REFRESH = "refresh";

  private final JwtProperties jwtProperties;
  private final SecretKey signingKey;

  public JwtTokenService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
    // 애플리케이션 시작 시점에 서명키를 한 번 생성해 재사용한다.
    // 문자열 -> 바이트 배열 -> 대칭키 객체 생성
    this.signingKey =
        Keys.hmacShaKeyFor(jwtProperties.secretKey().getBytes(StandardCharsets.UTF_8));
  }

  /** 액세스 토큰을 발급한다. subject에는 회원 ID를 저장한다. */
  // 액세스 토큰 -> 사용자 권한 증명, Jwt 토큰 -> 데이터 규격 정의
  public String generateAccessToken(Integer memberId, String email, Collection<String> roles) {
    // 절대 시점을 기억하기 위해 Instant 사용
    Instant issuedAt = Instant.now();
    Instant expiresAt = issuedAt.plusSeconds(jwtProperties.accessTokenExpireSeconds());

    return Jwts.builder()
        .issuer(jwtProperties.issuer())
        .subject(String.valueOf(memberId))
        .claim(CLAIM_TOKEN_TYPE, TOKEN_TYPE_ACCESS)
        .claim("email", email)
        .claim("roles", roles)
        .issuedAt(Date.from(issuedAt))
        .expiration(Date.from(expiresAt))
        .signWith(signingKey)
        .compact();
  }

  /** 리프레시 토큰을 발급한다. 토큰 회전을 위해 jti와 familyId를 함께 클레임에 담는다. */
  public String generateRefreshToken(Integer memberId, String jti, String familyId) {
    Instant issuedAt = Instant.now();
    Instant expiresAt = issuedAt.plusSeconds(jwtProperties.refreshTokenExpireSeconds());

    return Jwts.builder()
        .issuer(jwtProperties.issuer())
        .subject(String.valueOf(memberId))
        .id(jti)
        .claim(CLAIM_TOKEN_TYPE, TOKEN_TYPE_REFRESH)
        .claim(CLAIM_FAMILY_ID, familyId)
        .issuedAt(Date.from(issuedAt))
        .expiration(Date.from(expiresAt))
        .signWith(signingKey)
        .compact();
  }

  /** 토큰을 파싱해서 애플리케이션에서 쓰기 쉬운 JwtSubject로 변환한다. */
  public JwtSubject parse(String token) {
    return parseAccessToken(token);
  }

  /** 액세스 토큰을 파싱하고 사용자 식별 정보/권한을 반환한다. */
  public JwtSubject parseAccessToken(String token) {
    Claims claims = parseClaims(token);
    assertTokenType(claims, TOKEN_TYPE_ACCESS);
    Integer memberId = Integer.valueOf(claims.getSubject());
    String email = claims.get("email", String.class);
    List<String> roles = toStringList(claims.get("roles"));
    return new JwtSubject(memberId, email, roles);
  }

  /** 리프레시 토큰을 파싱하고 회전에 필요한 식별 정보(jti/familyId)를 반환한다. */
  public JwtRefreshSubject parseRefreshToken(String token) {
    Claims claims = parseClaims(token);
    assertTokenType(claims, TOKEN_TYPE_REFRESH);
    Integer memberId = Integer.valueOf(claims.getSubject());
    String jti = claims.getId();
    String familyId = claims.get(CLAIM_FAMILY_ID, String.class);

    if (jti == null || jti.isBlank() || familyId == null || familyId.isBlank()) {
      throw new IllegalArgumentException("Refresh token claims are invalid.");
    }

    return new JwtRefreshSubject(memberId, jti, familyId);
  }

  /** 서명/만료/형식 검증만 수행한다. 예외를 밖으로 던지지 않고 boolean으로 반환한다. */
  public boolean validate(String token) {
    try {
      parseClaims(token);
      return true;
    } catch (JwtException | IllegalArgumentException exception) {
      return false;
    }
  }

  /** JJWT 파서를 통해 서명 검증 후 payload(claims)를 추출한다. */
  private Claims parseClaims(String token) {
    return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
  }

  /** 요청한 토큰 타입(access/refresh)과 실제 클레임 타입이 일치하는지 검증한다. */
  private void assertTokenType(Claims claims, String expectedType) {
    String tokenType = claims.get(CLAIM_TOKEN_TYPE, String.class);
    if (!expectedType.equals(tokenType)) {
      throw new IllegalArgumentException("Invalid token type.");
    }
  }

  /** roles 클레임을 안전하게 문자열 리스트로 변환한다. 값이 없거나 형식이 다르면 빈 리스트를 반환한다. */
  private List<String> toStringList(Object claimValue) {
    if (claimValue instanceof Collection<?> collection) {
      return collection.stream().map(String::valueOf).toList();
    }

    return List.of();
  }
}
