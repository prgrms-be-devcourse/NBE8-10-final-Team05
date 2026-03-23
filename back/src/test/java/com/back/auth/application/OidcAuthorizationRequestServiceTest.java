package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.back.global.exception.ServiceException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.web.util.UriComponentsBuilder;

@DisplayName("OIDC authorize 요청 서비스 테스트")
class OidcAuthorizationRequestServiceTest {

  @Test
  @DisplayName("authorize 시작 시 state/nonce/code_verifier를 저장하고 provider URL을 생성한다")
  void startAuthorizationStoresStateAndBuildsProviderUrl() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizationRequestService service = createService(clock, 300L);

    OidcAuthorizationRequestService.OidcAuthorizationStartResult result =
        service.startAuthorization(
            "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080");

    assertThat(result.authorizeUrl()).startsWith("https://accounts.example.com/oauth2/v2/auth");
    assertThat(result.state()).isNotBlank();
    assertThat(result.nonce()).isNotBlank();
    assertThat(result.codeVerifier()).isNotBlank();
    assertThat(result.expiresAt()).isEqualTo(Instant.parse("2026-03-20T00:05:00Z"));

    var queryParams =
        UriComponentsBuilder.fromUriString(result.authorizeUrl()).build(true).getQueryParams();
    assertThat(queryParams.getFirst("response_type")).isEqualTo("code");
    assertThat(queryParams.getFirst("client_id")).isEqualTo("test-client-id");
    assertThat(queryParams.getFirst("redirect_uri"))
        .isEqualTo("http://localhost:8080/login/oauth2/code/maum-on-oidc");
    assertThat(queryParams.getFirst("state")).isEqualTo(result.state());
    assertThat(queryParams.getFirst("nonce")).isEqualTo(result.nonce());
    assertThat(queryParams.getFirst("code_challenge")).isNotBlank();
    assertThat(queryParams.getFirst("code_challenge_method")).isEqualTo("S256");

    OidcAuthorizationRequestService.OidcAuthorizationState saved =
        service.findState(result.state()).orElseThrow();
    assertThat(saved.redirectUri()).isEqualTo("http://localhost:3000/login");
    assertThat(saved.nonce()).isEqualTo(result.nonce());
    assertThat(saved.codeVerifier()).isEqualTo(result.codeVerifier());
    assertThat(saved.isConsumed()).isFalse();
  }

  @Test
  @DisplayName("state는 1회용이라 consume 후 재사용하면 차단된다")
  void consumeStateRejectsReuse() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizationRequestService service = createService(clock, 300L);

    OidcAuthorizationRequestService.OidcAuthorizationStartResult result =
        service.startAuthorization(
            "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080");

    OidcAuthorizationRequestService.OidcAuthorizationState consumed =
        service.consumeState(result.state());
    assertThat(consumed.isConsumed()).isTrue();

    assertThatThrownBy(() -> service.consumeState(result.state()))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode())
                    .isEqualTo("401-8"));
  }

  @Test
  @DisplayName("state 만료 이후 consume 시 차단된다")
  void consumeStateRejectsExpiredState() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizationRequestService service = createService(clock, 1L);

    OidcAuthorizationRequestService.OidcAuthorizationStartResult result =
        service.startAuthorization(
            "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080");
    clock.plusSeconds(2);

    assertThatThrownBy(() -> service.consumeState(result.state()))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode())
                    .isEqualTo("401-7"));
  }

  @Test
  @DisplayName("authorize 기능이 비활성화면 403-4로 차단된다")
  void startAuthorizationFailsWhenFeatureDisabled() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizeProperties properties =
        new OidcAuthorizeProperties(
            false, 300L, List.of("http://localhost:3000", "http://127.0.0.1:3000"));
    OidcAuthorizationRequestService service =
        new OidcAuthorizationRequestService(
            properties, new InMemoryClientRegistrationRepository(createRegistration()), clock);

    assertThatThrownBy(
            () ->
                service.startAuthorization(
                    "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode())
                    .isEqualTo("403-4"));
  }

  @Test
  @DisplayName("허용되지 않은 redirect_uri는 400-3으로 차단된다")
  void startAuthorizationFailsWhenRedirectUriNotAllowed() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizationRequestService service = createService(clock, 300L);

    assertThatThrownBy(
            () ->
                service.startAuthorization(
                    "maum-on-oidc", "https://evil.example.com/callback", "http://localhost:8080"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode())
                    .isEqualTo("400-3"));
  }

  @Test
  @DisplayName("미지원 provider로 authorize 시작 시 400-2를 반환한다")
  void startAuthorizationFailsWhenProviderUnsupported() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizationRequestService service = createService(clock, 300L);

    assertThatThrownBy(
            () ->
                service.startAuthorization(
                    "unsupported", "http://localhost:3000/login", "http://localhost:8080"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode())
                    .isEqualTo("400-2"));
  }

  private OidcAuthorizationRequestService createService(MutableClock clock, long ttlSeconds) {
    OidcAuthorizeProperties properties =
        new OidcAuthorizeProperties(
            true, ttlSeconds, List.of("http://localhost:3000", "http://127.0.0.1:3000"));
    return new OidcAuthorizationRequestService(
        properties, new InMemoryClientRegistrationRepository(createRegistration()), clock);
  }

  private ClientRegistration createRegistration() {
    return ClientRegistration.withRegistrationId("maum-on-oidc")
        .clientId("test-client-id")
        .clientSecret("test-client-secret")
        .clientName("OIDC")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .authorizationUri("https://accounts.example.com/oauth2/v2/auth")
        .tokenUri("https://accounts.example.com/oauth2/v2/token")
        .userInfoUri("https://accounts.example.com/userinfo")
        .userNameAttributeName("sub")
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .scope("openid", "profile", "email")
        .build();
  }

  private static final class MutableClock extends Clock {

    private Instant instant;

    private MutableClock(Instant initialInstant) {
      this.instant = initialInstant;
    }

    @Override
    public ZoneId getZone() {
      return ZoneId.of("UTC");
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return instant;
    }

    void plusSeconds(long seconds) {
      instant = instant.plusSeconds(seconds);
    }
  }
}
