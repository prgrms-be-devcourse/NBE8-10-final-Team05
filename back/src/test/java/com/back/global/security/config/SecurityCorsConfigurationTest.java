package com.back.global.security.config;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.global.aspect.ResponseAspect;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.adapter.in.web.MemberController;
import com.back.member.application.MemberService;
import com.back.member.domain.MemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MemberController.class)
@Import({
  ResponseAspect.class,
  SecurityConfig.class,
  SecurityAuthenticationEntryPoint.class,
  SecurityAccessDeniedHandler.class
})
@ActiveProfiles("test")
@TestPropertySource(
    properties = "FRONTEND_ALLOWED_ORIGIN_PATTERNS=https://front.example.com,https://*.vercel.app")
@DisplayName("시큐리티 CORS 설정 테스트")
class SecurityCorsConfigurationTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private MemberService memberService;
  @MockitoBean private MemberRepository memberRepository;
  @MockitoBean private JwtTokenService jwtTokenService;

  @Test
  @DisplayName("배포 프론트 origin은 preflight 요청을 통과한다")
  void preflightAllowsConfiguredFrontendOrigin() throws Exception {
    mockMvc
        .perform(
            options("/api/v1/members")
                .header(HttpHeaders.ORIGIN, "https://front.example.com")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(
            header().string(
                HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://front.example.com"));
  }

  @Test
  @DisplayName("배포 프리뷰 origin 패턴도 preflight 요청을 통과한다")
  void preflightAllowsConfiguredPreviewPattern() throws Exception {
    mockMvc
        .perform(
            options("/api/v1/members")
                .header(HttpHeaders.ORIGIN, "https://preview-123.vercel.app")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
        .andExpect(status().isOk())
        .andExpect(
            header().string(
                HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
                "https://preview-123.vercel.app"));
  }
}
