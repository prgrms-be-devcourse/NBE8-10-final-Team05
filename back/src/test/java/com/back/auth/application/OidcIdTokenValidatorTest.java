package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.back.global.exception.ServiceException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import tools.jackson.databind.ObjectMapper;

@DisplayName("OIDC id_token 검증 테스트")
class OidcIdTokenValidatorTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final Clock fixedClock = Clock.fixed(Instant.parse("2026-03-20T00:00:00Z"), ZoneId.of("UTC"));
  private final OidcIdTokenValidator validator = new OidcIdTokenValidator(objectMapper, fixedClock);

  @Test
  @DisplayName("iss/aud/exp/nonce/sub가 유효하면 claim을 반환한다")
  void validateSuccess() {
    ClientRegistration registration = registration("maum-on-oidc", "test-client-id", "https://accounts.example.com");
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put("iss", "https://accounts.example.com");
    claims.put("aud", List.of("test-client-id"));
    claims.put("exp", Instant.parse("2026-03-20T00:10:00Z").getEpochSecond());
    claims.put("nonce", "expected-nonce");
    claims.put("sub", "provider-user-1");
    claims.put("email", "OIDC@TEST.COM");
    claims.put("name", "oidc-user");

    OidcIdTokenValidator.OidcIdTokenClaims result =
        validator.validate(registration, unsignedToken(claims), "expected-nonce");

    assertThat(result.subject()).isEqualTo("provider-user-1");
    assertThat(result.email()).isEqualTo("oidc@test.com");
    assertThat(result.nickname()).isEqualTo("oidc-user");
  }

  @Test
  @DisplayName("nonce가 불일치하면 401-9 예외를 반환한다")
  void validateFailsOnNonceMismatch() {
    ClientRegistration registration = registration("maum-on-oidc", "test-client-id", "https://accounts.example.com");
    Map<String, Object> claims = baseClaims();
    claims.put("nonce", "different-nonce");

    assertThatThrownBy(() -> validator.validate(registration, unsignedToken(claims), "expected-nonce"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-9"));
  }

  @Test
  @DisplayName("aud가 불일치하면 401-11 예외를 반환한다")
  void validateFailsOnAudienceMismatch() {
    ClientRegistration registration = registration("maum-on-oidc", "test-client-id", "https://accounts.example.com");
    Map<String, Object> claims = baseClaims();
    claims.put("aud", "another-client-id");

    assertThatThrownBy(() -> validator.validate(registration, unsignedToken(claims), "expected-nonce"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-11"));
  }

  @Test
  @DisplayName("issuer가 불일치하면 401-11 예외를 반환한다")
  void validateFailsOnIssuerMismatch() {
    ClientRegistration registration =
        registration("maum-on-oidc", "test-client-id", "https://accounts.example.com");
    Map<String, Object> claims = baseClaims();
    claims.put("iss", "https://attacker.example.com");

    assertThatThrownBy(() -> validator.validate(registration, unsignedToken(claims), "expected-nonce"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-11"));
  }

  @Test
  @DisplayName("exp가 만료되면 401-11 예외를 반환한다")
  void validateFailsOnExpiredToken() {
    ClientRegistration registration =
        registration("maum-on-oidc", "test-client-id", "https://accounts.example.com");
    Map<String, Object> claims = baseClaims();
    claims.put("exp", Instant.parse("2026-03-19T23:59:59Z").getEpochSecond());

    assertThatThrownBy(() -> validator.validate(registration, unsignedToken(claims), "expected-nonce"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-11"));
  }

  @Test
  @DisplayName("sub가 없으면 401-11 예외를 반환한다")
  void validateFailsWhenSubjectMissing() {
    ClientRegistration registration =
        registration("maum-on-oidc", "test-client-id", "https://accounts.example.com");
    Map<String, Object> claims = baseClaims();
    claims.remove("sub");

    assertThatThrownBy(() -> validator.validate(registration, unsignedToken(claims), "expected-nonce"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-11"));
  }

  @Test
  @DisplayName("id_token 형식이 잘못되면 401-11 예외를 반환한다")
  void validateFailsWhenTokenMalformed() {
    ClientRegistration registration =
        registration("maum-on-oidc", "test-client-id", "https://accounts.example.com");

    assertThatThrownBy(() -> validator.validate(registration, "not-a-jwt", "expected-nonce"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-11"));
  }

  private Map<String, Object> baseClaims() {
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put("iss", "https://accounts.example.com");
    claims.put("aud", "test-client-id");
    claims.put("exp", Instant.parse("2026-03-20T00:10:00Z").getEpochSecond());
    claims.put("nonce", "expected-nonce");
    claims.put("sub", "provider-user-1");
    return claims;
  }

  private ClientRegistration registration(String registrationId, String clientId, String issuerUri) {
    return ClientRegistration.withRegistrationId(registrationId)
        .clientId(clientId)
        .clientSecret("secret")
        .clientName("oidc")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .authorizationUri("https://accounts.example.com/oauth2/auth")
        .tokenUri("https://accounts.example.com/oauth2/token")
        .userInfoUri("https://accounts.example.com/userinfo")
        .userNameAttributeName("sub")
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .scope("openid", "profile", "email")
        .providerConfigurationMetadata(Map.of("issuer", issuerUri))
        .issuerUri(issuerUri)
        .build();
  }

  private String unsignedToken(Map<String, Object> claims) {
    try {
      String headerJson = objectMapper.writeValueAsString(Map.of("alg", "none", "typ", "JWT"));
      String claimsJson = objectMapper.writeValueAsString(claims);
      return encode(headerJson) + "." + encode(claimsJson) + ".";
    } catch (Exception exception) {
      throw new IllegalStateException(exception);
    }
  }

  private String encode(String json) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
  }
}
