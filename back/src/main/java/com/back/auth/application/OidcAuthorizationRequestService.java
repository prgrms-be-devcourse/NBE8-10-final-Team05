package com.back.auth.application;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * OIDC 로그인 시작(authorize) 단계의 보안 파라미터를 생성/저장/검증하는 서비스.
 *
 * <p>핵심 보안 목적:
 *
 * <ul>
 *   <li>CSRF 방어: state 생성 및 callback 시 1회용 검증
 *   <li>ID Token 재사용/치환 방어: nonce 생성 및 callback 단계 전달 준비
 *   <li>Authorization Code 탈취 방어: PKCE(code_verifier/code_challenge) 생성
 *   <li>오픈 리다이렉트 방어: redirect_uri allowlist 강제
 * </ul>
 *
 * <p>현재 저장소는 인메모리(ConcurrentHashMap)이며, 단일 인스턴스 기준으로 동작한다.
 * 멀티 인스턴스 환경에서는 Redis 같은 중앙 저장소로 대체가 필요하다.
 */
@Service
@RequiredArgsConstructor
public class OidcAuthorizationRequestService {

  /** URL-safe Base64 인코더(패딩 제거). state/nonce/verifier/challenge 인코딩에 사용한다. */
  private static final Base64.Encoder BASE64_URL_ENCODER =
      Base64.getUrlEncoder().withoutPadding();
  private static final String REDIRECT_ACTION_LOGIN = "login";
  private static final String SCHEME_HTTP = "http";
  private static final String SCHEME_HTTPS = "https";
  private static final String SCOPE_DELIMITER = " ";

  private final OidcAuthorizeProperties properties;
  private final ClientRegistrationRepository clientRegistrationRepository;
  private final Clock clock;
  /**
   * state 기준 인증 진행 상태 저장소.
   *
   * <p>값에는 provider/redirectUri/nonce/codeVerifier/만료시각/소비시각이 포함된다.
   */
  private final Map<String, OidcAuthorizationState> stateStore = new ConcurrentHashMap<>();

  /**
   * authorize 시작 요청을 처리하고 provider authorize URL을 생성한다.
   *
   * <p>처리 순서:
   *
   * <ol>
   *   <li>feature flag 활성화 여부 확인
   *   <li>provider 유효성 확인 및 ClientRegistration 조회
   *   <li>클라이언트 redirect_uri allowlist 검증
   *   <li>state/nonce/code_verifier 생성 + TTL 저장
   *   <li>provider authorize URL 생성 후 반환
   * </ol>
   */
  public synchronized OidcAuthorizationStartResult startAuthorization(
      String provider, String redirectUri, String baseUrl) {
    // 1) 기능 플래그 off면 즉시 차단
    if (!properties.authorizeEnabled()) {
      throw AuthErrorCode.OIDC_AUTHORIZE_DISABLED.toException();
    }

    // 2) provider 식별자 정규화 후 Spring OAuth2 Client 설정 조회
    String normalizedProvider = normalizeProvider(provider);
    ClientRegistration clientRegistration =
        Optional.ofNullable(clientRegistrationRepository.findByRegistrationId(normalizedProvider))
            .orElseThrow(AuthErrorCode.OIDC_PROVIDER_NOT_SUPPORTED::toException);

    // 3) 프론트 복귀 URI를 allowlist 정책으로 검증
    String normalizedRedirectUri = validateAndNormalizeRedirectUri(redirectUri);
    Instant now = Instant.now(clock);

    // 4) 저장소 정리: 이미 소비되었고 동시에 만료된 state만 제거
    //    (만료 전 consumed state는 재사용 탐지(401-8)를 위해 유지)
    cleanupConsumedExpiredStates(now);

    // 5) 보안 파라미터 생성
    String state = randomToken(32);
    String nonce = randomToken(32);
    String codeVerifier = randomToken(64);
    Instant expiresAt = now.plusSeconds(properties.authorizeTtlSeconds());

    // 6) callback 검증에 필요한 값 저장
    OidcAuthorizationState savedState =
        OidcAuthorizationState.issue(
            state, normalizedProvider, normalizedRedirectUri, nonce, codeVerifier, now, expiresAt);
    stateStore.put(state, savedState);

    // 7) provider callback 용 redirect_uri 템플릿 확장
    String providerRedirectUri =
        expandRedirectUriTemplate(
            clientRegistration.getRedirectUri(), normalizedProvider, normalizeBaseUrl(baseUrl));

    // 8) 최종 authorize URL 구성
    String authorizeUrl =
        buildAuthorizeUrl(clientRegistration, providerRedirectUri, state, nonce, codeVerifier);

    return new OidcAuthorizationStartResult(
        authorizeUrl, state, nonce, codeVerifier, normalizedRedirectUri, expiresAt);
  }

  /**
   * callback 단계에서 state를 검증하고 1회 소비 처리한다.
   *
   * <p>검증 실패 시:
   *
   * <ul>
   *   <li>형식/미존재: 401-6
   *   <li>만료: 401-7
   *   <li>재사용(replay): 401-8
   * </ul>
   */
  public synchronized OidcAuthorizationState consumeState(String state) {
    if (!StringUtils.hasText(state)) {
      throw AuthErrorCode.OIDC_STATE_INVALID.toException();
    }

    Instant now = Instant.now(clock);
    cleanupConsumedExpiredStates(now);

    OidcAuthorizationState savedState = stateStore.get(state);
    if (savedState == null) {
      throw AuthErrorCode.OIDC_STATE_INVALID.toException();
    }
    if (savedState.isExpired(now)) {
      stateStore.remove(state);
      throw AuthErrorCode.OIDC_STATE_EXPIRED.toException();
    }
    if (savedState.isConsumed()) {
      throw AuthErrorCode.OIDC_STATE_REPLAY_DETECTED.toException();
    }

    OidcAuthorizationState consumed = savedState.consume(now);
    stateStore.put(state, consumed);
    return consumed;
  }

  /** 테스트/운영 점검용 state 조회 헬퍼. */
  public synchronized Optional<OidcAuthorizationState> findState(String state) {
    if (!StringUtils.hasText(state)) {
      return Optional.empty();
    }
    cleanupConsumedExpiredStates(Instant.now(clock));
    return Optional.ofNullable(stateStore.get(state));
  }

  /** provider 파라미터를 정규화/검증한다. */
  private String normalizeProvider(String provider) {
    if (!StringUtils.hasText(provider)) {
      throw AuthErrorCode.OIDC_PROVIDER_NOT_SUPPORTED.toException();
    }
    return provider.trim().toLowerCase(Locale.ROOT);
  }

  /** 서버 baseUrl 유효성을 검증한다. */
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

  /**
   * 프론트 redirect_uri를 정규화/검증한다.
   *
   * <p>허용 조건:
   *
   * <ul>
   *   <li>절대 URI
   *   <li>http/https 스킴
   *   <li>allowlist(host/port/path prefix) 일치
   * </ul>
   */
  private String validateAndNormalizeRedirectUri(String redirectUri) {
    if (!StringUtils.hasText(redirectUri)) {
      throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
    }
    URI candidate;
    try {
      candidate = URI.create(redirectUri.trim());
    } catch (IllegalArgumentException exception) {
      throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
    }
    if (!candidate.isAbsolute()) {
      throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
    }
    String scheme = candidate.getScheme();
    if (!SCHEME_HTTP.equalsIgnoreCase(scheme) && !SCHEME_HTTPS.equalsIgnoreCase(scheme)) {
      throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
    }

    if (!isRedirectUriAllowed(candidate)) {
      throw AuthErrorCode.OIDC_REDIRECT_URI_NOT_ALLOWED.toException();
    }
    return candidate.toString();
  }

  /** allowlist와 redirect_uri 후보를 host/port/path-prefix 기준으로 대조한다. */
  private boolean isRedirectUriAllowed(URI candidate) {
    if (properties.redirectUriAllowlist().isEmpty()) {
      return false;
    }

    for (String allowed : properties.redirectUriAllowlist()) {
      URI allowedUri;
      try {
        allowedUri = URI.create(allowed);
      } catch (IllegalArgumentException exception) {
        continue;
      }
      if (!allowedUri.isAbsolute()) {
        continue;
      }
      if (!equalsIgnoreCase(allowedUri.getScheme(), candidate.getScheme())) {
        continue;
      }
      if (!equalsIgnoreCase(allowedUri.getHost(), candidate.getHost())) {
        continue;
      }
      if (normalizedPort(allowedUri) != normalizedPort(candidate)) {
        continue;
      }
      if (!matchesPathPrefix(
          normalizePath(allowedUri.getPath()), normalizePath(candidate.getPath()))) {
        continue;
      }
      return true;
    }
    return false;
  }

  /** Spring OAuth2 redirect-uri 템플릿({baseUrl}, {registrationId} 등)을 실제 값으로 확장한다. */
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

  /**
   * provider authorize URL을 생성한다.
   *
   * <p>OIDC/PKCE 필수 파라미터(state, nonce, code_challenge)를 포함한다.
   */
  private String buildAuthorizeUrl(
      ClientRegistration clientRegistration,
      String providerRedirectUri,
      String state,
      String nonce,
      String codeVerifier) {
    UriComponentsBuilder builder =
        UriComponentsBuilder.fromUriString(
                clientRegistration.getProviderDetails().getAuthorizationUri())
            .queryParam("response_type", "code")
            .queryParam("client_id", clientRegistration.getClientId())
            .queryParam("redirect_uri", providerRedirectUri)
            .queryParam("state", state)
            .queryParam("nonce", nonce)
            .queryParam("code_challenge", toCodeChallenge(codeVerifier))
            .queryParam("code_challenge_method", "S256");

    String scope = joinScopes(clientRegistration.getScopes());
    if (StringUtils.hasText(scope)) {
      builder.queryParam("scope", scope);
    }
    return builder.build().encode().toUriString();
  }

  /** 등록된 scope 컬렉션을 RFC6749 형식(공백 구분)으로 직렬화한다. */
  private String joinScopes(Collection<String> scopes) {
    if (scopes == null || scopes.isEmpty()) {
      return "";
    }
    return String.join(SCOPE_DELIMITER, scopes);
  }

  /** PKCE S256 code_challenge 생성: BASE64URL(SHA-256(code_verifier)). */
  private String toCodeChallenge(String codeVerifier) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
      return BASE64_URL_ENCODER.encodeToString(hashed);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 algorithm is required.", exception);
    }
  }

  /** CSPRNG 기반 랜덤 토큰 생성. */
  private String randomToken(int byteLength) {
    byte[] bytes = new byte[byteLength];
    SecureRandomHolder.INSTANCE.nextBytes(bytes);
    return BASE64_URL_ENCODER.encodeToString(bytes);
  }

  /**
   * 저장소 청소 정책.
   *
   * <p>만료 + 소비 완료 상태만 삭제한다.
   * 만료 전 consumed state를 유지하는 이유는 동일 state 재사용 시점을 replay(401-8)로 식별하기 위해서다.
   */
  private void cleanupConsumedExpiredStates(Instant now) {
    stateStore
        .entrySet()
        .removeIf(entry -> entry.getValue().isExpired(now) && entry.getValue().isConsumed());
  }

  /** URI의 명시/기본 포트를 정규화해서 비교한다. */
  private int normalizedPort(URI uri) {
    if (uri.getPort() >= 0) {
      return uri.getPort();
    }
    return SCHEME_HTTPS.equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
  }

  /** null-safe 대소문자 무시 문자열 비교. */
  private boolean equalsIgnoreCase(String left, String right) {
    if (left == null || right == null) {
      return false;
    }
    return left.equalsIgnoreCase(right);
  }

  /** 경로 문자열을 비교 가능한 형태로 정규화한다. */
  private String normalizePath(String path) {
    if (!StringUtils.hasText(path)) {
      return "/";
    }
    if (path.length() > 1 && path.endsWith("/")) {
      return path.substring(0, path.length() - 1);
    }
    return path;
  }

  /** allowlist path-prefix 정책을 평가한다. */
  private boolean matchesPathPrefix(String allowedPath, String candidatePath) {
    if ("/".equals(allowedPath)) {
      return true;
    }
    return candidatePath.equals(allowedPath) || candidatePath.startsWith(allowedPath + "/");
  }

  /** authorize 시작 응답 DTO. */
  public record OidcAuthorizationStartResult(
      String authorizeUrl,
      String state,
      String nonce,
      String codeVerifier,
      String redirectUri,
      Instant expiresAt) {}

  /** 서버 저장용 인증 상태 엔트리(state 기반). */
  public record OidcAuthorizationState(
      String state,
      String provider,
      String redirectUri,
      String nonce,
      String codeVerifier,
      Instant createdAt,
      Instant expiresAt,
      Instant consumedAt) {

    /** 신규 authorize 요청 상태를 생성한다. */
    static OidcAuthorizationState issue(
        String state,
        String provider,
        String redirectUri,
        String nonce,
        String codeVerifier,
        Instant createdAt,
        Instant expiresAt) {
      return new OidcAuthorizationState(
          state, provider, redirectUri, nonce, codeVerifier, createdAt, expiresAt, null);
    }

    /** callback 검증이 끝난 state를 소비 처리한다. */
    OidcAuthorizationState consume(Instant consumedAt) {
      return new OidcAuthorizationState(
          state, provider, redirectUri, nonce, codeVerifier, createdAt, expiresAt, consumedAt);
    }

    /** 현재 시각 기준 만료 여부. */
    boolean isExpired(Instant now) {
      return !expiresAt.isAfter(now);
    }

    /** 1회용 state 소비 여부. */
    boolean isConsumed() {
      return consumedAt != null;
    }
  }

  /** 지연 초기화된 SecureRandom 싱글턴 홀더. */
  private static final class SecureRandomHolder {
    private static final java.security.SecureRandom INSTANCE = new java.security.SecureRandom();

    private SecureRandomHolder() {}
  }
}
