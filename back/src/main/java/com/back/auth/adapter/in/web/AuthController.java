package com.back.auth.adapter.in.web;

import com.back.auth.adapter.in.web.dto.AuthLoginRequest;
import com.back.auth.adapter.in.web.dto.AuthMemberResponse;
import com.back.auth.adapter.in.web.dto.AuthSignupRequest;
import com.back.auth.adapter.in.web.dto.AuthTokenResponse;
import com.back.auth.application.AuthErrorCode;
import com.back.auth.application.AuthService;
import com.back.auth.application.AuthSuccessCode;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 라이프사이클(signup/login/refresh/logout/me) API 컨트롤러. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;
  private final RefreshTokenCookieService refreshTokenCookieService;

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
    refreshTokenCookieService.issueRefreshTokenCookie(response, issueResult.refreshToken());
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
    refreshTokenCookieService.issueRefreshTokenCookie(response, issueResult.refreshToken());
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

  private AuthenticatedMember resolveAuthenticatedMember(Authentication authentication) {
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthenticatedMember principal)) {
      throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
    }
    return principal;
  }
}
