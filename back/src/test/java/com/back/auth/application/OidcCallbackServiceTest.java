package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.back.auth.domain.OAuthAccount;
import com.back.auth.domain.OAuthAccountRepository;
import com.back.auth.application.OidcAuthorizationRequestService.OidcAuthorizationStartResult;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("OIDC callback 서비스 테스트")
class OidcCallbackServiceTest {

  @Mock private ClientRegistrationRepository clientRegistrationRepository;
  @Mock private OidcTokenClient oidcTokenClient;
  @Mock private OidcIdTokenValidator oidcIdTokenValidator;
  @Mock private OAuthAccountRepository oauthAccountRepository;
  @Mock private MemberRepository memberRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private AuthService authService;

  @Test
  @DisplayName("callback 성공 시 oauth_accounts로 회원 매핑 후 내부 토큰 발급 경로를 재사용한다")
  void callbackSuccess() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizeProperties properties =
        new OidcAuthorizeProperties(true, 300L, List.of("http://localhost:3000"));
    OidcAuthorizationRequestService authorizationRequestService =
        new OidcAuthorizationRequestService(properties, clientRegistrationRepository, clock);
    OidcCallbackService callbackService =
        new OidcCallbackService(
            properties,
            authorizationRequestService,
            clientRegistrationRepository,
            oidcTokenClient,
            oidcIdTokenValidator,
            oauthAccountRepository,
            memberRepository,
            passwordEncoder,
            authService,
            clock);

    ClientRegistration registration = registration("maum-on-oidc");
    given(clientRegistrationRepository.findByRegistrationId("maum-on-oidc")).willReturn(registration);

    OidcAuthorizationStartResult startResult =
        authorizationRequestService.startAuthorization(
            "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080");

    given(
            oidcTokenClient.exchangeCode(
                any(ClientRegistration.class), any(String.class), any(String.class), any(String.class)))
        .willReturn(
            new OidcTokenClient.OidcTokenResponse(
                "access-from-provider", "id-token", "Bearer", 3600L, "openid profile email"));

    given(
            oidcIdTokenValidator.validate(
                any(ClientRegistration.class), any(String.class), any(String.class)))
        .willReturn(
            new OidcIdTokenValidator.OidcIdTokenClaims(
                "provider-user-1", "oidc@test.com", "oidc-user"));

    given(oauthAccountRepository.findByProviderAndProviderUserId("maum-on-oidc", "provider-user-1"))
        .willReturn(Optional.empty());
    given(memberRepository.findByEmail("oidc@test.com")).willReturn(Optional.empty());
    given(passwordEncoder.encode(any(String.class))).willReturn("$2a$10$hash");

    Member savedMember = Member.create("oidc@test.com", "$2a$10$hash", "oidc-user");
    ReflectionTestUtils.setField(savedMember, "id", 100L);
    given(memberRepository.save(any(Member.class))).willReturn(savedMember);
    given(oauthAccountRepository.findByMemberIdAndProvider(100L, "maum-on-oidc"))
        .willReturn(Optional.empty());
    given(oauthAccountRepository.save(any(OAuthAccount.class))).willAnswer(invocation -> invocation.getArgument(0));

    AuthService.AuthTokenIssueResult issueResult =
        new AuthService.AuthTokenIssueResult(
            new com.back.auth.adapter.in.web.dto.AuthTokenResponse(
                "internal-access-token",
                "Bearer",
                3600L,
                new com.back.auth.adapter.in.web.dto.AuthMemberResponse(
                    100L, "oidc@test.com", "oidc-user", "USER", "ACTIVE")),
            "internal-refresh-token");
    given(authService.issueTokenPairForMember(savedMember)).willReturn(issueResult);

    OidcCallbackService.OidcCallbackResult result =
        callbackService.handleCallback(
            "maum-on-oidc", "auth-code", startResult.state(), "http://localhost:8080");

    assertThat(result.redirectUri()).isEqualTo("http://localhost:3000/login");
    assertThat(result.issueResult().response().accessToken()).isEqualTo("internal-access-token");
    assertThat(result.issueResult().refreshToken()).isEqualTo("internal-refresh-token");
    then(authService).should().issueTokenPairForMember(savedMember);
  }

  @Test
  @DisplayName("state mismatch(provider 불일치)는 401-6으로 차단된다")
  void callbackFailsOnStateMismatch() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizeProperties properties =
        new OidcAuthorizeProperties(true, 300L, List.of("http://localhost:3000"));
    OidcAuthorizationRequestService authorizationRequestService =
        new OidcAuthorizationRequestService(properties, clientRegistrationRepository, clock);
    OidcCallbackService callbackService =
        new OidcCallbackService(
            properties,
            authorizationRequestService,
            clientRegistrationRepository,
            oidcTokenClient,
            oidcIdTokenValidator,
            oauthAccountRepository,
            memberRepository,
            passwordEncoder,
            authService,
            clock);

    ClientRegistration registration = registration("maum-on-oidc");
    given(clientRegistrationRepository.findByRegistrationId("maum-on-oidc")).willReturn(registration);

    OidcAuthorizationStartResult startResult =
        authorizationRequestService.startAuthorization(
            "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080");

    assertThatThrownBy(
            () ->
                callbackService.handleCallback(
                    "kakao", "auth-code", startResult.state(), "http://localhost:8080"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-6"));
  }

  @Test
  @DisplayName("nonce mismatch면 401-9로 실패한다")
  void callbackFailsOnNonceMismatch() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizeProperties properties =
        new OidcAuthorizeProperties(true, 300L, List.of("http://localhost:3000"));
    OidcAuthorizationRequestService authorizationRequestService =
        new OidcAuthorizationRequestService(properties, clientRegistrationRepository, clock);
    OidcCallbackService callbackService =
        new OidcCallbackService(
            properties,
            authorizationRequestService,
            clientRegistrationRepository,
            oidcTokenClient,
            oidcIdTokenValidator,
            oauthAccountRepository,
            memberRepository,
            passwordEncoder,
            authService,
            clock);

    ClientRegistration registration = registration("maum-on-oidc");
    given(clientRegistrationRepository.findByRegistrationId("maum-on-oidc")).willReturn(registration);

    OidcAuthorizationStartResult startResult =
        authorizationRequestService.startAuthorization(
            "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080");

    given(
            oidcTokenClient.exchangeCode(
                any(ClientRegistration.class), any(String.class), any(String.class), any(String.class)))
        .willReturn(new OidcTokenClient.OidcTokenResponse("provider-access", "id-token", "Bearer", 3600L, "openid"));
    given(
            oidcIdTokenValidator.validate(
                any(ClientRegistration.class), any(String.class), any(String.class)))
        .willThrow(AuthErrorCode.OIDC_NONCE_MISMATCH.toException());

    assertThatThrownBy(
            () ->
                callbackService.handleCallback(
                    "maum-on-oidc", "auth-code", startResult.state(), "http://localhost:8080"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-9"));
  }

  @Test
  @DisplayName("동일 state 재사용(replay) 시 두 번째 요청은 401-8로 차단된다")
  void callbackFailsOnReplay() {
    MutableClock clock = new MutableClock(Instant.parse("2026-03-20T00:00:00Z"));
    OidcAuthorizeProperties properties =
        new OidcAuthorizeProperties(true, 300L, List.of("http://localhost:3000"));
    OidcAuthorizationRequestService authorizationRequestService =
        new OidcAuthorizationRequestService(properties, clientRegistrationRepository, clock);
    OidcCallbackService callbackService =
        new OidcCallbackService(
            properties,
            authorizationRequestService,
            clientRegistrationRepository,
            oidcTokenClient,
            oidcIdTokenValidator,
            oauthAccountRepository,
            memberRepository,
            passwordEncoder,
            authService,
            clock);

    ClientRegistration registration = registration("maum-on-oidc");
    given(clientRegistrationRepository.findByRegistrationId("maum-on-oidc")).willReturn(registration);

    OidcAuthorizationStartResult startResult =
        authorizationRequestService.startAuthorization(
            "maum-on-oidc", "http://localhost:3000/login", "http://localhost:8080");

    Member member = Member.create("oidc@test.com", "$2a$10$hash", "oidc-user");
    ReflectionTestUtils.setField(member, "id", 1L);
    AuthService.AuthTokenIssueResult issueResult =
        new AuthService.AuthTokenIssueResult(
            new com.back.auth.adapter.in.web.dto.AuthTokenResponse(
                "access", "Bearer", 3600L,
                new com.back.auth.adapter.in.web.dto.AuthMemberResponse(1L, "oidc@test.com", "oidc-user", "USER", "ACTIVE")),
            "refresh");

    given(
            oidcTokenClient.exchangeCode(
                any(ClientRegistration.class), any(String.class), any(String.class), any(String.class)))
        .willReturn(new OidcTokenClient.OidcTokenResponse("provider-access", "id-token", "Bearer", 3600L, "openid"));
    given(
            oidcIdTokenValidator.validate(
                any(ClientRegistration.class), any(String.class), any(String.class)))
        .willReturn(new OidcIdTokenValidator.OidcIdTokenClaims("provider-user-1", "oidc@test.com", "oidc-user"));
    given(oauthAccountRepository.findByProviderAndProviderUserId("maum-on-oidc", "provider-user-1"))
        .willReturn(Optional.of(OAuthAccount.connect(member, "maum-on-oidc", "provider-user-1", "oidc@test.com")));
    given(authService.issueTokenPairForMember(any(Member.class))).willReturn(issueResult);

    callbackService.handleCallback("maum-on-oidc", "auth-code", startResult.state(), "http://localhost:8080");

    assertThatThrownBy(
            () ->
                callbackService.handleCallback(
                    "maum-on-oidc", "auth-code", startResult.state(), "http://localhost:8080"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-8"));
  }

  private ClientRegistration registration(String registrationId) {
    return ClientRegistration.withRegistrationId(registrationId)
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
        .providerConfigurationMetadata(Map.of("issuer", "https://accounts.example.com"))
        .issuerUri("https://accounts.example.com")
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

    @SuppressWarnings("unused")
    void plusSeconds(long seconds) {
      instant = instant.plusSeconds(seconds);
    }
  }
}
