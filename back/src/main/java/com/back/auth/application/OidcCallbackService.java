package com.back.auth.application;

import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import java.net.URI;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * OIDC callback 처리 서비스.
 *
 * <p>책임 범위:
 *
 * <ul>
 *   <li>authorize 단계에서 저장한 state를 검증/소비해 CSRF 및 replay를 방어한다.
 *   <li>authorization code를 provider token endpoint로 교환한다.
 *   <li>id_token claim(iss/aud/exp/nonce/sub)을 검증한다.
 *   <li>외부 계정(oauth_accounts)과 내부 Member를 조회/생성/연결한다.
 *   <li>기존 내부 인증 체계(AuthService)를 재사용해 access/refresh 토큰을 발급한다.
 * </ul>
 *
 * <p>외부 연동 실패와 보안 검증 실패는 AuthErrorCode 기반으로 명시적 예외를 반환한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OidcCallbackService {

  private static final Logger log = LoggerFactory.getLogger(OidcCallbackService.class);
  private static final String REDIRECT_ACTION_LOGIN = "login";

  private final OidcAuthorizeProperties properties;
  private final OidcAuthorizationRequestService oidcAuthorizationRequestService;
  private final ClientRegistrationRepository clientRegistrationRepository;
  private final OidcTokenClient oidcTokenClient;
  private final OidcIdTokenValidator oidcIdTokenValidator;
  private final OidcMemberLinkService oidcMemberLinkService;
  private final AuthService authService;

  /**
   * callback 파라미터를 검증하고 내부 로그인 세션으로 브릿지한다.
   *
   * <p>처리 순서:
   *
   * <ol>
   *   <li>feature flag, code 존재 여부 확인
   *   <li>state 1회 소비 및 provider 일치 검증
   *   <li>code -> token 교환
   *   <li>id_token 검증
   *   <li>회원 매핑/생성/연결
   *   <li>기존 AuthService 토큰 발급 경로 재사용
   * </ol>
   *
   * @param provider 콜백 경로의 provider 식별자
   * @param code provider가 전달한 authorization code
   * @param state authorize 단계에서 발급한 state
   * @param baseUrl 서버 base url(redirect_uri 템플릿 확장용)
   * @return 프론트 redirect URI와 내부 토큰 발급 결과
   */
  @Transactional
  public OidcCallbackResult handleCallback(String provider, String code, String state, String baseUrl) {
    String normalizedProvider = normalizeProvider(provider);
    try {
      ensureOidcAuthorizeEnabled();
      String requiredCode = requireAuthorizationCode(code);
      OidcAuthorizationRequestService.OidcAuthorizationState consumedState =
          consumeAndValidateState(normalizedProvider, state);
      ClientRegistration clientRegistration = findClientRegistration(normalizedProvider);
      String providerRedirectUri =
          toProviderRedirectUri(clientRegistration, normalizedProvider, normalizeBaseUrl(baseUrl));
      OidcTokenClient.OidcTokenResponse tokenResponse =
          exchangeCode(
              clientRegistration, requiredCode, providerRedirectUri, consumedState.codeVerifier());
      OidcIdTokenValidator.OidcIdTokenClaims claims =
          validateIdToken(clientRegistration, tokenResponse.idToken(), consumedState.nonce());
      Member member =
          oidcMemberLinkService.resolveMember(
              normalizedProvider, claims.subject(), claims.email(), claims.nickname());
      AuthService.AuthTokenIssueResult issueResult = issueInternalTokenPair(member);

      logCallbackSuccess(normalizedProvider, member.getId(), consumedState.redirectUri());
      return new OidcCallbackResult(consumedState.redirectUri(), issueResult);
    } catch (ServiceException exception) {
      logCallbackFailure(normalizedProvider, exception);
      throw exception;
    }
  }

  private void ensureOidcAuthorizeEnabled() {
    if (!properties.authorizeEnabled()) {
      throw AuthErrorCode.OIDC_AUTHORIZE_DISABLED.toException();
    }
  }

  private String requireAuthorizationCode(String code) {
    if (!StringUtils.hasText(code)) {
      throw AuthErrorCode.OIDC_AUTHORIZATION_CODE_REQUIRED.toException();
    }
    return code;
  }

  private OidcAuthorizationRequestService.OidcAuthorizationState consumeAndValidateState(
      String provider, String state) {
    OidcAuthorizationRequestService.OidcAuthorizationState consumedState =
        oidcAuthorizationRequestService.consumeState(state);
    if (!provider.equals(consumedState.provider())) {
      throw AuthErrorCode.OIDC_STATE_INVALID.toException();
    }
    return consumedState;
  }

  private ClientRegistration findClientRegistration(String provider) {
    return Optional.ofNullable(clientRegistrationRepository.findByRegistrationId(provider))
        .orElseThrow(AuthErrorCode.OIDC_PROVIDER_NOT_SUPPORTED::toException);
  }

  private String toProviderRedirectUri(
      ClientRegistration clientRegistration, String provider, String normalizedBaseUrl) {
    return expandRedirectUriTemplate(
        clientRegistration.getRedirectUri(), provider, normalizedBaseUrl);
  }

  private OidcTokenClient.OidcTokenResponse exchangeCode(
      ClientRegistration clientRegistration,
      String code,
      String providerRedirectUri,
      String codeVerifier) {
    return oidcTokenClient.exchangeCode(clientRegistration, code, providerRedirectUri, codeVerifier);
  }

  private OidcIdTokenValidator.OidcIdTokenClaims validateIdToken(
      ClientRegistration clientRegistration, String idToken, String expectedNonce) {
    return oidcIdTokenValidator.validate(clientRegistration, idToken, expectedNonce);
  }

  private AuthService.AuthTokenIssueResult issueInternalTokenPair(Member member) {
    return authService.issueTokenPairForMember(member);
  }

  private void logCallbackSuccess(String provider, long memberId, String redirectUri) {
    log.info(
        "oidc callback success. provider={}, memberId={}, redirectUri={}",
        provider,
        memberId,
        redirectUri);
  }

  private void logCallbackFailure(String provider, ServiceException exception) {
    log.warn(
        "oidc callback failed. provider={}, code={}, message={}",
        provider,
        exception.getRsData().resultCode(),
        exception.getRsData().msg());
  }

  /** provider 식별자를 소문자 기준으로 정규화한다. */
  private String normalizeProvider(String provider) {
    if (!StringUtils.hasText(provider)) {
      throw AuthErrorCode.OIDC_PROVIDER_NOT_SUPPORTED.toException();
    }
    return provider.trim().toLowerCase(Locale.ROOT);
  }

  /** redirect_uri 템플릿 확장에 사용할 서버 base URL 형식을 검증한다. */
  private String normalizeBaseUrl(String baseUrl) {
    if (!StringUtils.hasText(baseUrl)) {
      throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
    }
    try {
      URI parsed = URI.create(baseUrl.trim());
      if (!parsed.isAbsolute()) {
        throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
      }
      return parsed.toString();
    } catch (IllegalArgumentException exception) {
      throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
    }
  }

  /** Spring OAuth2 redirect-uri 템플릿({baseUrl}, {registrationId})을 실제 값으로 확장한다. */
  private String expandRedirectUriTemplate(
      String template, String registrationId, String normalizedBaseUrl) {
    URI baseUri = URI.create(normalizedBaseUrl);
    String basePath = normalizePath(baseUri.getPath());
    if ("/".equals(basePath)) {
      basePath = "";
    }
    String basePort = baseUri.getPort() < 0 ? "" : String.valueOf(baseUri.getPort());

    Map<String, Object> variables = new HashMap<>();
    variables.put("baseUrl", normalizedBaseUrl);
    variables.put("baseScheme", baseUri.getScheme());
    variables.put("baseHost", baseUri.getHost());
    variables.put("basePort", basePort);
    variables.put("basePath", basePath);
    variables.put("registrationId", registrationId);
    variables.put("action", REDIRECT_ACTION_LOGIN);
    return UriComponentsBuilder.fromUriString(template).buildAndExpand(variables).toUriString();
  }

  /** 경로 비교를 위한 단순 정규화(빈 경로 -> "/", trailing slash 제거). */
  private String normalizePath(String path) {
    if (!StringUtils.hasText(path)) {
      return "/";
    }
    if (path.length() > 1 && path.endsWith("/")) {
      return path.substring(0, path.length() - 1);
    }
    return path;
  }

  /** callback 처리 결과 DTO: 프론트 redirect 대상과 내부 토큰 발급 결과를 함께 전달한다. */
  public record OidcCallbackResult(String redirectUri, AuthService.AuthTokenIssueResult issueResult) {}
}
