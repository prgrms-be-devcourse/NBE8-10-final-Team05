package com.back.global.monitoring.adapter.in.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.auth.application.AuthErrorCode;
import com.back.auth.application.AuthService;
import com.back.auth.application.OidcAuthorizeProperties;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.global.security.adapter.in.JwtAuthenticationFilter;
import com.back.global.security.config.SecurityConfig;
import com.back.global.security.handler.OAuth2LoginSuccessHandler;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtProperties;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminMonitoringController.class)
@Import({
  SecurityConfig.class,
  SecurityAccessDeniedHandler.class,
  SecurityAuthenticationEntryPoint.class
})
class AdminMonitoringControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;
  @MockitoBean private JwtTokenService jwtTokenService;
  @MockitoBean private JwtProperties jwtProperties;
  @MockitoBean private OidcAuthorizeProperties oidcAuthorizeProperties;
  @MockitoBean private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
  @MockitoBean private ClientRegistrationRepository clientRegistrationRepository;
  @MockitoBean private AuthService authService;
  @MockitoBean private RefreshTokenCookieService refreshTokenCookieService;

  private Member adminMember;
  private Member userMember;

  @BeforeEach
  void setup() throws ServletException, IOException {
    doAnswer(invocation -> {
      HttpServletRequest request = invocation.getArgument(0);
      HttpServletResponse response = invocation.getArgument(1);
      FilterChain chain = invocation.getArgument(2);
      chain.doFilter(request, response);
      return null;
    }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

    adminMember = Member.create("admin@test.com", "encoded-password", "admin");
    adminMember.updateRole(MemberRole.ADMIN);
    adminMember.updateStatus(MemberStatus.ACTIVE);

    userMember = Member.create("user@test.com", "encoded-password", "user");
    userMember.updateRole(MemberRole.USER);
    userMember.updateStatus(MemberStatus.ACTIVE);
  }

  @TestConfiguration
  static class TestConfig {
    @Bean
    public com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
      return new com.fasterxml.jackson.databind.ObjectMapper();
    }
  }

  @Test
  @DisplayName("관리자는 모니터링 프록시 접근 검증에 성공한다")
  void authorizeMonitoringProxy_success() throws Exception {
    doReturn(Optional.of("refresh-token")).when(refreshTokenCookieService).resolveRefreshToken(any());
    doReturn(adminMember).when(authService).authenticateByRefreshToken("refresh-token");

    mockMvc.perform(get("/api/v1/admin/monitoring/auth").header("Cookie", "refreshToken=refresh-token"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-1"))
        .andExpect(jsonPath("$.msg").value("관리자 모니터링 프록시 접근을 확인했습니다."));
  }

  @Test
  @DisplayName("일반 유저는 모니터링 프록시 접근 검증에 실패한다")
  void authorizeMonitoringProxy_forbidden() throws Exception {
    doReturn(Optional.of("refresh-token")).when(refreshTokenCookieService).resolveRefreshToken(any());
    doReturn(userMember).when(authService).authenticateByRefreshToken("refresh-token");

    mockMvc.perform(get("/api/v1/admin/monitoring/auth").header("Cookie", "refreshToken=refresh-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-1"))
        .andExpect(jsonPath("$.msg").value("You do not have permission."));
  }

  @Test
  @DisplayName("비로그인 사용자는 모니터링 프록시 접근 검증에 실패한다")
  void authorizeMonitoringProxy_unauthorized() throws Exception {
    doReturn(Optional.empty()).when(refreshTokenCookieService).resolveRefreshToken(any());
    org.mockito.Mockito.doThrow(AuthErrorCode.AUTHENTICATION_REQUIRED.toException())
        .when(authService)
        .authenticateByRefreshToken(null);

    mockMvc.perform(get("/api/v1/admin/monitoring/auth"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"));
  }
}
