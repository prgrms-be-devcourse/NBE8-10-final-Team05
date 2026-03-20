package com.back.auth.adapter.in.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.auth.adapter.in.web.dto.AuthLoginRequest;
import com.back.auth.adapter.in.web.dto.AuthMemberResponse;
import com.back.auth.adapter.in.web.dto.AuthSignupRequest;
import com.back.auth.adapter.in.web.dto.AuthTokenResponse;
import com.back.auth.application.AuthService;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.global.aspect.ResponseAspect;
import com.back.global.exception.ServiceException;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.global.security.config.SecurityConfig;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtTokenService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@WebMvcTest(AuthController.class)
@Import({
  ResponseAspect.class,
  SecurityConfig.class,
  SecurityAuthenticationEntryPoint.class,
  SecurityAccessDeniedHandler.class
})
@ActiveProfiles("test")
@DisplayName("인증 컨트롤러 API 테스트")
class AuthControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockitoBean private AuthService authService;
  @MockitoBean private RefreshTokenCookieService refreshTokenCookieService;
  @MockitoBean private JwtTokenService jwtTokenService;

  @Test
  @DisplayName("회원 가입 API는 회원 정보를 반환한다")
  void signupReturnsCreatedMember() throws Exception {
    AuthSignupRequest request = new AuthSignupRequest("member1@test.com", "plain-pass", "member1");
    AuthMemberResponse response =
        new AuthMemberResponse(1, "member1@test.com", "member1", "USER", "ACTIVE");
    given(authService.signup(any(AuthSignupRequest.class))).willReturn(response);

    mockMvc
        .perform(
            post("/api/v1/auth/signup")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("201-2"))
        .andExpect(jsonPath("$.data.email").value("member1@test.com"));
  }

  @Test
  @DisplayName("로그인 API는 access 토큰을 반환하고 refresh 쿠키 발급 메서드를 호출한다")
  void loginIssuesAccessTokenAndRefreshCookie() throws Exception {
    AuthLoginRequest request = new AuthLoginRequest("member2@test.com", "plain-pass");
    AuthTokenResponse response =
        new AuthTokenResponse(
            "access-token",
            "Bearer",
            3600L,
            new AuthMemberResponse(2, "member2@test.com", "member2", "USER", "ACTIVE"));
    given(authService.login(any(AuthLoginRequest.class)))
        .willReturn(new AuthService.AuthTokenIssueResult(response, "refresh-token"));

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-3"))
        .andExpect(jsonPath("$.data.accessToken").value("access-token"));

    then(refreshTokenCookieService).should().issueRefreshTokenCookie(any(), any(String.class));
  }

  @Test
  @DisplayName("로그인 API는 인증 실패 시 401-2 응답을 반환한다")
  void loginReturns401WhenCredentialsInvalid() throws Exception {
    AuthLoginRequest request = new AuthLoginRequest("member2@test.com", "wrong-pass");
    given(authService.login(any(AuthLoginRequest.class)))
        .willThrow(new ServiceException("401-2", "Invalid email or password."));

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-2"))
        .andExpect(jsonPath("$.msg").value("Invalid email or password."));
  }

  @Test
  @DisplayName("refresh API는 쿠키에서 refresh 토큰을 읽어 회전 후 응답한다")
  void refreshRotatesToken() throws Exception {
    AuthTokenResponse response =
        new AuthTokenResponse(
            "next-access",
            "Bearer",
            3600L,
            new AuthMemberResponse(3, "member3@test.com", "member3", "USER", "ACTIVE"));
    given(refreshTokenCookieService.resolveRefreshToken(any()))
        .willReturn(Optional.of("raw-refresh-token"));
    given(authService.refresh("raw-refresh-token"))
        .willReturn(new AuthService.AuthTokenIssueResult(response, "next-refresh-token"));

    mockMvc
        .perform(post("/api/v1/auth/refresh"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-4"))
        .andExpect(jsonPath("$.data.accessToken").value("next-access"));

    then(refreshTokenCookieService).should().issueRefreshTokenCookie(any(), any(String.class));
  }

  @Test
  @DisplayName("로그아웃 API는 refresh 폐기 시도 후 쿠키 만료 메서드를 호출한다")
  void logoutExpiresCookie() throws Exception {
    given(refreshTokenCookieService.resolveRefreshToken(any()))
        .willReturn(Optional.of("raw-refresh-token"));

    mockMvc
        .perform(post("/api/v1/auth/logout"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-5"));

    then(authService).should().logout("raw-refresh-token");
    then(refreshTokenCookieService).should().expireRefreshTokenCookie(any());
  }

  @Test
  @DisplayName("me API는 인증된 principal이 있으면 현재 사용자 정보를 반환한다")
  void meReturnsCurrentMember() throws Exception {
    AuthenticatedMember principal =
        new AuthenticatedMember(4, "member4@test.com", List.of("ROLE_USER"));
    UsernamePasswordAuthenticationToken authenticationToken =
        new UsernamePasswordAuthenticationToken(
            principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    AuthMemberResponse response =
        new AuthMemberResponse(4, "member4@test.com", "member4", "USER", "ACTIVE");
    given(authService.me(principal)).willReturn(response);

    mockMvc
        .perform(get("/api/v1/auth/me").with(authentication(authenticationToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-6"))
        .andExpect(jsonPath("$.data.id").value(4))
        .andExpect(jsonPath("$.data.email").value("member4@test.com"));
  }
}
