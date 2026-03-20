package com.back.auth.adapter.in.web;

import com.back.auth.adapter.in.web.dto.AuthLoginRequest;
import com.back.auth.adapter.in.web.dto.AuthMemberResponse;
import com.back.auth.adapter.in.web.dto.AuthSignupRequest;
import com.back.auth.adapter.in.web.dto.AuthTokenResponse;
import com.back.auth.application.AuthErrorCode;
import com.back.auth.application.AuthService;
import com.back.auth.application.AuthSuccessCode;
import com.back.auth.application.OidcAuthorizationRequestService;
import com.back.auth.application.OidcCallbackService;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
  private static final int HTTP_DEFAULT_PORT = 80;
  private static final int HTTPS_DEFAULT_PORT = 443;

  private final AuthService authService;
  private final RefreshTokenCookieService refreshTokenCookieService;
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
    return new RsData<>(
        AuthSuccessCode.REFRESH_SUCCESS.code(),
        AuthSuccessCode.REFRESH_SUCCESS.message(),
        issueResult.response());
  }

  /** 로그아웃 API: refresh 폐기 시도 후 쿠키를 항상 만료시킨다. */
  @PostMapping("/logout")
  public RsData<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    String rawRefreshToken = refreshTokenCookieService.resolveRefreshToken(request).orElse(null);
    authService.logout(rawRefreshToken);
    refreshTokenCookieService.expireRefreshTokenCookie(response);
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

  private void issueRefreshCookie(HttpServletResponse response, String refreshToken) {
    refreshTokenCookieService.issueRefreshTokenCookie(response, refreshToken);
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
}
