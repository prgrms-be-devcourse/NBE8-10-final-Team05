package com.back.auth.adapter.in.web;

import com.back.auth.adapter.in.web.dto.AuthLoginRequest;
import com.back.auth.adapter.in.web.dto.AuthMemberResponse;
import com.back.auth.adapter.in.web.dto.AuthSignupRequest;
import com.back.auth.adapter.in.web.dto.AuthTokenResponse;
import com.back.auth.application.AuthErrorCode;
import com.back.auth.application.AuthService;
import com.back.auth.application.AuthSuccessCode;
import com.back.auth.application.AuthHintCookieService;
import com.back.auth.application.OidcAuthorizationRequestService;
import com.back.auth.application.OidcCallbackService;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

/** 로그인 라이프사이클(signup/login/refresh/logout/me) API 컨트롤러. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

  private static final String HTTP_SCHEME = "http";
  private static final String HTTPS_SCHEME = "https";
  private static final String HEADER_X_FORWARDED_HOST = "X-Forwarded-Host";
  private static final String HEADER_X_FORWARDED_PORT = "X-Forwarded-Port";
  private static final String HEADER_X_FORWARDED_PROTO = "X-Forwarded-Proto";
  private static final int HTTP_DEFAULT_PORT = 80;
  private static final int HTTPS_DEFAULT_PORT = 443;

  private final AuthService authService;
  private final RefreshTokenCookieService refreshTokenCookieService;
  private final AuthHintCookieService authHintCookieService;
  private final OidcAuthorizationRequestService oidcAuthorizationRequestService;
  private final OidcCallbackService oidcCallbackService;

  /** 회원 가입 API. */
  @PostMapping("/signup")
  public RsData<AuthMemberResponse> signup(@RequestBody AuthSignupRequest request) {
    AuthMemberResponse response = authService.signup(request);
    return new RsData<>(
        AuthSuccessCode.SIGNUP_SUCCESS.code(), AuthSuccessCode.SIGNUP_SUCCESS.message(), response);
  }

  /** 로그인 API: access 토큰 응답 + refresh HttpOnly 쿠키 발급. */
  @PostMapping("/login")
  public RsData<AuthTokenResponse> login(
      @RequestBody AuthLoginRequest request, HttpServletResponse response) {
    AuthService.AuthTokenIssueResult issueResult = authService.login(request);
    issueRefreshCookie(response, issueResult.refreshToken());
    authHintCookieService.issueAuthenticatedHintCookie(
        response, issueResult.response().member().role());
    return new RsData<>(
        AuthSuccessCode.LOGIN_SUCCESS.code(),
        AuthSuccessCode.LOGIN_SUCCESS.message(),
        issueResult.response());
  }

  /** refresh API: refresh 회전 + 기존 refresh 폐기 + 새 access/refresh 발급. */
  @PostMapping("/refresh")
  public RsData<AuthTokenResponse> refresh(
      HttpServletRequest request, HttpServletResponse response) {
    String rawRefreshToken = refreshTokenCookieService.resolveRefreshToken(request).orElse(null);
    AuthService.AuthTokenIssueResult issueResult = authService.refresh(rawRefreshToken);
    issueRefreshCookie(response, issueResult.refreshToken());
    authHintCookieService.issueAuthenticatedHintCookie(
        response, issueResult.response().member().role());
    return new RsData<>(
        AuthSuccessCode.REFRESH_SUCCESS.code(),
        AuthSuccessCode.REFRESH_SUCCESS.message(),
        issueResult.response());
  }

  /** 현재 refresh 쿠키가 유효한지만 확인하고 access 토큰 payload를 재구성한다(회전 없음). */
  @GetMapping("/session")
  public RsData<AuthTokenResponse> session(HttpServletRequest request) {
    String rawRefreshToken = refreshTokenCookieService.resolveRefreshToken(request).orElse(null);
    AuthTokenResponse response = authService.issueSessionToken(rawRefreshToken);
    return new RsData<>(
        AuthSuccessCode.SESSION_SUCCESS.code(),
        AuthSuccessCode.SESSION_SUCCESS.message(),
        response);
  }

  /** 로그아웃 API: refresh 폐기 시도 후 쿠키를 항상 만료시킨다. */
  @PostMapping("/logout")
  public RsData<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    String rawRefreshToken = refreshTokenCookieService.resolveRefreshToken(request).orElse(null);
    authService.logout(rawRefreshToken);
    invalidateServerSession(request);
    SecurityContextHolder.clearContext();
    refreshTokenCookieService.expireRefreshTokenCookie(response);
    authHintCookieService.expireAuthHintCookie(response);
    expireSessionCookie(response, request.getContextPath());
    return new RsData<>(
        AuthSuccessCode.LOGOUT_SUCCESS.code(), AuthSuccessCode.LOGOUT_SUCCESS.message());
  }

  /** 현재 로그인 사용자 정보 조회 API. */
  @GetMapping("/me")
  public RsData<AuthMemberResponse> me(Authentication authentication) {
    AuthenticatedMember authenticatedMember = resolveAuthenticatedMember(authentication);
    AuthMemberResponse response = authService.me(authenticatedMember);
    return new RsData<>(
        AuthSuccessCode.ME_SUCCESS.code(), AuthSuccessCode.ME_SUCCESS.message(), response);
  }

  /** OIDC 로그인 시작 API: state/nonce/code_verifier를 저장하고 provider authorize URL로 리다이렉트한다. */
  @GetMapping("/oidc/authorize/{provider}")
  public ResponseEntity<Void> startOidcAuthorize(
      @PathVariable String provider,
      @RequestParam(name = "redirect_uri") String redirectUri,
      HttpServletRequest request) {
    String baseUrl = resolveBaseUrl(request);
    OidcAuthorizationRequestService.OidcAuthorizationStartResult result =
        oidcAuthorizationRequestService.startAuthorization(provider, redirectUri, baseUrl);
    return redirectTo(result.authorizeUrl());
  }

  /** OIDC callback API: code/state 검증 후 내부 JWT(refresh 쿠키 포함) 발급하고 프론트로 리다이렉트한다. */
  @GetMapping("/oidc/callback/{provider}")
  public ResponseEntity<Void> handleOidcCallback(
      @PathVariable String provider,
      @RequestParam(name = "code", required = false) String code,
      @RequestParam(name = "state", required = false) String state,
      HttpServletRequest request,
      HttpServletResponse response) {
    OidcCallbackService.OidcCallbackResult callbackResult =
        oidcCallbackService.handleCallback(provider, code, state, resolveBaseUrl(request));
    issueRefreshCookie(response, callbackResult.issueResult().refreshToken());
    authHintCookieService.issueAuthenticatedHintCookie(
        response, callbackResult.issueResult().response().member().role());
    return redirectTo(callbackResult.redirectUri());
  }

  private AuthenticatedMember resolveAuthenticatedMember(Authentication authentication) {
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthenticatedMember principal)) {
      throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
    }
    return principal;
  }

  private String resolveBaseUrl(HttpServletRequest request) {
    String forwardedBaseUrl = resolveForwardedBaseUrl(request);
    if (forwardedBaseUrl != null) {
      return forwardedBaseUrl;
    }

    String scheme = request.getScheme();
    String serverName = request.getServerName();
    int port = request.getServerPort();
    String contextPath = request.getContextPath();

    boolean defaultPort = isDefaultPort(scheme, port);
    StringBuilder builder = new StringBuilder();
    builder.append(scheme).append("://").append(serverName);
    if (!defaultPort) {
      builder.append(':').append(port);
    }
    if (hasContextPath(contextPath)) {
      builder.append(contextPath);
    }
    return builder.toString();
  }

  private String resolveForwardedBaseUrl(HttpServletRequest request) {
    String forwardedProto = firstForwardedHeaderValue(request.getHeader(HEADER_X_FORWARDED_PROTO));
    String forwardedHost = firstForwardedHeaderValue(request.getHeader(HEADER_X_FORWARDED_HOST));
    if (!StringUtils.hasText(forwardedProto) || !StringUtils.hasText(forwardedHost)) {
      return null;
    }

    String forwardedPort = firstForwardedHeaderValue(request.getHeader(HEADER_X_FORWARDED_PORT));
    StringBuilder builder = new StringBuilder();
    builder.append(forwardedProto).append("://").append(forwardedHost);

    Integer parsedForwardedPort = parseForwardedPort(forwardedPort);
    if (!hostContainsExplicitPort(forwardedHost)
        && parsedForwardedPort != null
        && !isDefaultPort(forwardedProto, parsedForwardedPort)) {
      builder.append(':').append(parsedForwardedPort);
    }

    if (hasContextPath(request.getContextPath())) {
      builder.append(request.getContextPath());
    }

    return builder.toString();
  }

  private void issueRefreshCookie(HttpServletResponse response, String refreshToken) {
    refreshTokenCookieService.issueRefreshTokenCookie(response, refreshToken);
  }

  private void invalidateServerSession(HttpServletRequest request) {
    var session = request.getSession(false);
    if (session != null) {
      session.invalidate();
    }
  }

  private void expireSessionCookie(HttpServletResponse response, String contextPath) {
    String cookiePath = hasContextPath(contextPath) ? contextPath : "/";
    ResponseCookie cookie =
        ResponseCookie.from("JSESSIONID", "")
            .path(cookiePath)
            .httpOnly(true)
            .maxAge(0)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private ResponseEntity<Void> redirectTo(String uri) {
    return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(uri)).build();
  }

  private boolean isDefaultPort(String scheme, int port) {
    return (HTTP_SCHEME.equalsIgnoreCase(scheme) && port == HTTP_DEFAULT_PORT)
        || (HTTPS_SCHEME.equalsIgnoreCase(scheme) && port == HTTPS_DEFAULT_PORT);
  }

  private boolean hasContextPath(String contextPath) {
    return contextPath != null && !contextPath.isBlank();
  }

  private String firstForwardedHeaderValue(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    String[] tokens = value.split(",");
    if (tokens.length == 0) {
      return null;
    }

    String normalized = tokens[0].trim();
    return normalized.isEmpty() ? null : normalized;
  }

  private Integer parseForwardedPort(String forwardedPort) {
    if (!StringUtils.hasText(forwardedPort)) {
      return null;
    }

    try {
      return Integer.parseInt(forwardedPort);
    } catch (NumberFormatException exception) {
      return null;
    }
  }

  private boolean hostContainsExplicitPort(String host) {
    if (!StringUtils.hasText(host)) {
      return false;
    }

    if (host.startsWith("[")) {
      return host.contains("]:");
    }

    int firstColon = host.indexOf(':');
    return firstColon >= 0 && firstColon == host.lastIndexOf(':');
  }
}
