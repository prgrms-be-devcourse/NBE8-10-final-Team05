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

  private final JwtProperties jwtProperties;
  private final SecretKey signingKey;

  public JwtTokenService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
    // 애플리케이션 시작 시점에 서명키를 한 번 생성해 재사용한다.
    // 문자열 -> 바이트 배열 -> 대칭키 객체 생성
    this.signingKey = Keys.hmacShaKeyFor(jwtProperties.secretKey().getBytes(StandardCharsets.UTF_8));
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
        .claim("email", email)
        .claim("roles", roles)
        .issuedAt(Date.from(issuedAt))
        .expiration(Date.from(expiresAt))
        .signWith(signingKey)
        .compact();
  }

  /** 토큰을 파싱해서 애플리케이션에서 쓰기 쉬운 JwtSubject로 변환한다. */
  public JwtSubject parse(String token) {
    Claims claims = parseClaims(token);
    Integer memberId = Integer.valueOf(claims.getSubject());
    String email = claims.get("email", String.class);
    List<String> roles = toStringList(claims.get("roles"));
    return new JwtSubject(memberId, email, roles);
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

  /** roles 클레임을 안전하게 문자열 리스트로 변환한다. 값이 없거나 형식이 다르면 빈 리스트를 반환한다. */
  private List<String> toStringList(Object claimValue) {
    if (claimValue instanceof Collection<?> collection) {
      return collection.stream().map(String::valueOf).toList();
    }

    return List.of();
  }
}
