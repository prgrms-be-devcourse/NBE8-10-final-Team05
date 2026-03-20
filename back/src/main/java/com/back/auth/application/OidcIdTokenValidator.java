package com.back.auth.application;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * OIDC `id_token` claim 검증기.
 *
 * <p>이 컴포넌트는 callback 단계에서 provider가 반환한 `id_token` payload를 파싱한 뒤,
 * 애플리케이션이 반드시 확인해야 하는 보안 claim을 검증한다.
 *
 * <p>검증 대상:
 *
 * <ul>
 *   <li>`iss`: 기대 issuer와 일치하는지
 *   <li>`aud`: 현재 client_id가 audience에 포함되는지
 *   <li>`exp`: 토큰이 현재 시각 기준 만료되지 않았는지
 *   <li>`nonce`: authorize 단계에서 저장한 nonce와 일치하는지
 *   <li>`sub`: provider 사용자 식별자가 존재하는지
 * </ul>
 *
 * <p>서명(JWS) 자체 검증은 이 클래스 범위 밖이며, claim 검증 책임만 가진다.
 */
@Component
@RequiredArgsConstructor
public class OidcIdTokenValidator {

  private static final String CLAIM_ISSUER = "iss";
  private static final String CLAIM_AUDIENCE = "aud";
  private static final String CLAIM_EXPIRES_AT = "exp";
  private static final String CLAIM_NONCE = "nonce";
  private static final String CLAIM_SUBJECT = "sub";
  private static final String CLAIM_EMAIL = "email";
  private static final String JWT_PART_SEPARATOR_REGEX = "\\.";
  private static final int JWT_PAYLOAD_PART_INDEX = 1;
  private static final int MIN_JWT_PART_COUNT = 2;
  private static final List<String> NICKNAME_CLAIM_KEYS =
      List.of("name", "nickname", "preferred_username", "given_name");

  /** JWT payload JSON 파싱용 ObjectMapper. */
  private final ObjectMapper objectMapper;
  /** 테스트 가능성을 위해 주입받는 기준 시계. */
  private final Clock clock;

  /**
   * `id_token`을 검증하고 내부에서 사용할 최소 사용자 식별 claim을 반환한다.
   *
   * @param clientRegistration 현재 provider/client 설정
   * @param idToken token endpoint 응답의 id_token
   * @param expectedNonce authorize 단계에 저장한 nonce
   * @return 검증 완료된 사용자 claim(subject/email/nickname)
   */
  public OidcIdTokenClaims validate(
      ClientRegistration clientRegistration, String idToken, String expectedNonce) {
    JsonNode claims = parseClaims(idToken);

    validateIssuer(clientRegistration, claims);
    validateAudience(clientRegistration, claims);
    validateExpiration(claims);
    validateNonce(claims, expectedNonce);

    String subject = requiredTextClaim(claims, CLAIM_SUBJECT);
    String email = normalizeEmail(optionalTextClaim(claims, CLAIM_EMAIL));
    String nickname = resolveNickname(claims);
    return new OidcIdTokenClaims(subject, email, nickname);
  }

  /** JWT 문자열에서 payload 부분을 Base64URL 디코딩해 claim tree로 변환한다. */
  private JsonNode parseClaims(String idToken) {
    if (!StringUtils.hasText(idToken)) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
    String[] parts = idToken.split(JWT_PART_SEPARATOR_REGEX);
    if (parts.length < MIN_JWT_PART_COUNT) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
    try {
      byte[] decodedPayload = Base64.getUrlDecoder().decode(parts[JWT_PAYLOAD_PART_INDEX]);
      String payloadJson = new String(decodedPayload, StandardCharsets.UTF_8);
      return objectMapper.readTree(payloadJson);
    } catch (Exception exception) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
  }

  /** issuer claim이 등록된 provider issuer와 일치하는지 검증한다. */
  private void validateIssuer(ClientRegistration clientRegistration, JsonNode claims) {
    String issuer = optionalTextClaim(claims, CLAIM_ISSUER);
    String expectedIssuer = clientRegistration.getProviderDetails().getIssuerUri();
    if (!isSameIssuer(issuer, expectedIssuer)) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
  }

  /** audience claim에 현재 client_id가 포함되는지 검증한다. */
  private void validateAudience(ClientRegistration clientRegistration, JsonNode claims) {
    JsonNode audienceNode = claims.get(CLAIM_AUDIENCE);
    if (!containsAudience(audienceNode, clientRegistration.getClientId())) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
  }

  /** 만료 시각(exp) 기준으로 현재 토큰 유효 여부를 검증한다. */
  private void validateExpiration(JsonNode claims) {
    Long exp = optionalLongClaim(claims, CLAIM_EXPIRES_AT);
    if (exp == null || exp <= Instant.now(clock).getEpochSecond()) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
  }

  /** authorize 단계 nonce와 id_token nonce의 일치 여부를 검증한다. */
  private void validateNonce(JsonNode claims, String expectedNonce) {
    String nonce = optionalTextClaim(claims, CLAIM_NONCE);
    if (!StringUtils.hasText(nonce) || !nonce.equals(expectedNonce)) {
      throw AuthErrorCode.OIDC_NONCE_MISMATCH.toException();
    }
  }

  /** aud claim이 문자열/배열 형태 모두에서 기대 client_id를 포함하는지 확인한다. */
  private boolean containsAudience(JsonNode audienceNode, String expectedAudience) {
    if (audienceNode == null || audienceNode.isNull()) {
      return false;
    }
    if (audienceNode.isTextual()) {
      return expectedAudience.equals(audienceNode.asText());
    }
    if (audienceNode.isArray()) {
      for (JsonNode item : audienceNode) {
        if (expectedAudience.equals(item.asText())) {
          return true;
        }
      }
    }
    return false;
  }

  /** issuer 비교 시 trailing slash 차이는 허용한다. */
  private boolean isSameIssuer(String actualIssuer, String expectedIssuer) {
    if (!StringUtils.hasText(actualIssuer) || !StringUtils.hasText(expectedIssuer)) {
      return false;
    }
    return trimTrailingSlash(actualIssuer).equals(trimTrailingSlash(expectedIssuer));
  }

  /** issuer 정규화용 헬퍼. */
  private String trimTrailingSlash(String value) {
    String trimmed = value.trim();
    if (trimmed.endsWith("/")) {
      return trimmed.substring(0, trimmed.length() - 1);
    }
    return trimmed;
  }

  /** email claim을 내부 저장 규칙(소문자/trim)으로 정규화한다. */
  private String normalizeEmail(String email) {
    if (!StringUtils.hasText(email)) {
      return null;
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }

  /** provider별 편차를 고려해 여러 후보 claim 키에서 닉네임을 추출한다. */
  private String resolveNickname(JsonNode claims) {
    for (String key : NICKNAME_CLAIM_KEYS) {
      String value = optionalTextClaim(claims, key);
      if (StringUtils.hasText(value)) {
        return value.trim();
      }
    }
    return null;
  }

  /** claim이 없거나 빈 문자열이면 null, 아니면 trim 문자열을 반환한다. */
  private String optionalTextClaim(JsonNode claims, String key) {
    JsonNode node = claims.get(key);
    if (node == null || node.isNull()) {
      return null;
    }
    String value = node.asText();
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  /** 필수 문자열 claim을 반환한다. 누락 시 OIDC_ID_TOKEN_INVALID를 발생시킨다. */
  private String requiredTextClaim(JsonNode claims, String key) {
    String value = optionalTextClaim(claims, key);
    if (!StringUtils.hasText(value)) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
    return value;
  }

  /** 숫자/문자열 claim을 Long으로 안전 변환한다. */
  private Long optionalLongClaim(JsonNode claims, String key) {
    JsonNode node = claims.get(key);
    if (node == null || node.isNull()) {
      return null;
    }
    if (node.isNumber()) {
      return node.longValue();
    }
    if (node.isTextual() && StringUtils.hasText(node.asText())) {
      try {
        return Long.parseLong(node.asText());
      } catch (NumberFormatException exception) {
        return null;
      }
    }
    return null;
  }

  /** 검증 완료 후 callback 처리에서 사용하는 최소 사용자 claim DTO. */
  public record OidcIdTokenClaims(String subject, String email, String nickname) {}
}
