package com.back.auth.application;

import com.back.auth.domain.OAuthAccount;
import com.back.auth.domain.OAuthAccountRepository;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
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
  private static final String FALLBACK_EMAIL_DOMAIN = "@oidc.local";
  private static final String DEFAULT_NICKNAME = "anonymous";
  private static final int MAX_SANITIZED_SUBJECT_LENGTH = 80;
  private static final Pattern UNSAFE_SUBJECT_PATTERN = Pattern.compile("[^a-zA-Z0-9._-]");

  private final OidcAuthorizeProperties properties;
  private final OidcAuthorizationRequestService oidcAuthorizationRequestService;
  private final ClientRegistrationRepository clientRegistrationRepository;
  private final OidcTokenClient oidcTokenClient;
  private final OidcIdTokenValidator oidcIdTokenValidator;
  private final OAuthAccountRepository oauthAccountRepository;
  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthService authService;
  private final Clock clock;

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
      Member member = resolveMember(normalizedProvider, claims);
      AuthService.AuthTokenIssueResult issueResult = issueInternalTokenPair(member);

      logCallbackSuccess(normalizedProvider, member.getId(), consumedState.redirectUri());
      return new OidcCallbackResult(consumedState.redirectUri(), issueResult);
    } catch (ServiceException exception) {
      logCallbackFailure(normalizedProvider, exception);
      throw exception;
    }
  }

  /**
   * 외부 계정 정보를 기준으로 내부 Member를 결정한다.
   *
   * <p>규칙:
   *
   * <ul>
   *   <li>provider+providerUserId 매핑이 있으면 기존 Member 사용(lastLoginAt/email 업데이트)
   *   <li>매핑이 없으면 새 Member를 생성하되, 다른 계정과 email 충돌 시 provider scoped fallback email 사용
   *   <li>최종적으로 oauth_accounts 연결 레코드를 보장
   * </ul>
   */
  @Transactional
  protected Member resolveMember(String provider, OidcIdTokenValidator.OidcIdTokenClaims claims) {
    LocalDateTime now = LocalDateTime.now(clock);
    String providerUserId = claims.subject().trim();

    String providerEmail = normalizeEmailClaim(claims.email());
    Optional<OAuthAccount> linkedAccount =
        findLinkedAccount(provider, providerUserId, providerEmail, now);
    if (linkedAccount.isPresent()) {
      return resolveLinkedMember(
          linkedAccount.get(), provider, providerUserId, providerEmail, claims.nickname());
    }

    String memberEmail = resolveMemberEmail(provider, providerUserId, providerEmail);
    String nickname =
        normalizeNickname(
            claims.nickname(), providerEmail != null ? providerEmail : memberEmail);
    Member member = createOidcMember(memberEmail, nickname);
    linkProviderAccountIfAbsent(member, provider, providerUserId, providerEmail);
    return member;
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

  private Optional<OAuthAccount> findLinkedAccount(
      String provider, String providerUserId, String email, LocalDateTime now) {
    return oauthAccountRepository
        .findByProviderAndProviderUserId(provider, providerUserId)
        .map(
            account -> {
              account.touchLastLoginAt(now);
              account.updateEmailAtProvider(email);
              return account;
            });
  }

  private Member resolveLinkedMember(
      OAuthAccount linkedAccount,
      String provider,
      String providerUserId,
      String providerEmail,
      String nicknameClaim) {
    if (!shouldSplitAutoLinkedMember(linkedAccount)) {
      return linkedAccount.getMember();
    }

    String memberEmail = resolveMemberEmail(provider, providerUserId, providerEmail);
    String nickname =
        normalizeNickname(nicknameClaim, providerEmail != null ? providerEmail : memberEmail);
    Member separatedMember = createOidcMember(memberEmail, nickname);
    linkedAccount.reassignMember(separatedMember);
    return separatedMember;
  }

  private boolean shouldSplitAutoLinkedMember(OAuthAccount linkedAccount) {
    return oauthAccountRepository.findAllByMemberIdOrderByIdAsc(linkedAccount.getMember().getId()).size() > 1;
  }

  private String normalizeEmailClaim(String emailClaim) {
    if (!StringUtils.hasText(emailClaim)) {
      return null;
    }

    return emailClaim.trim().toLowerCase(Locale.ROOT);
  }

  /**
   * 동일 이메일 자동 연결은 금지한다.
   *
   * <p>다른 provider 계정이 같은 이메일을 공유하더라도 별도 내부 회원으로 분리해
   * 기존 프로필/설정이 다른 provider 로그인에 섞이지 않도록 한다.
   */
  private String resolveMemberEmail(String provider, String providerUserId, String providerEmail) {
    if (providerEmail != null && !memberRepository.existsByEmail(providerEmail)) {
      return providerEmail;
    }

    return buildFallbackEmail(provider, providerUserId);
  }

  private void linkProviderAccountIfAbsent(
      Member member, String provider, String providerUserId, String email) {
    if (oauthAccountRepository.findByMemberIdAndProvider(member.getId(), provider).isPresent()) {
      return;
    }
    oauthAccountRepository.save(OAuthAccount.connect(member, provider, providerUserId, email));
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

  /** OIDC 신규 회원 생성 전용 헬퍼. 임의 비밀번호 해시를 생성해 내부 규칙을 만족시킨다. */
  private Member createOidcMember(String email, String nickname) {
    String generatedPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    Member member = Member.create(email, generatedPasswordHash, nickname);
    return memberRepository.save(member);
  }

  /** provider 이메일을 내부 식별자로 쓸 수 없을 때 provider scoped 대체 이메일을 생성한다. */
  private String buildFallbackEmail(String provider, String providerUserId) {
    String sanitizedSubject = UNSAFE_SUBJECT_PATTERN.matcher(providerUserId).replaceAll("_");
    if (sanitizedSubject.length() > MAX_SANITIZED_SUBJECT_LENGTH) {
      sanitizedSubject = sanitizedSubject.substring(0, MAX_SANITIZED_SUBJECT_LENGTH);
    }
    return provider + "_" + sanitizedSubject + FALLBACK_EMAIL_DOMAIN;
  }

  /** nickname claim 누락 시 email local-part를 fallback으로 사용한다. */
  private String normalizeNickname(String nickname, String emailFallback) {
    if (StringUtils.hasText(nickname)) {
      return nickname.trim();
    }

    int atIndex = emailFallback.indexOf('@');
    if (atIndex > 0) {
      return emailFallback.substring(0, atIndex);
    }
    return DEFAULT_NICKNAME;
  }

  /** callback 처리 결과 DTO: 프론트 redirect 대상과 내부 토큰 발급 결과를 함께 전달한다. */
  public record OidcCallbackResult(String redirectUri, AuthService.AuthTokenIssueResult issueResult) {}
}
