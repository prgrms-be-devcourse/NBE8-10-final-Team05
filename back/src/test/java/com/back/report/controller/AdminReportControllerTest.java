package com.back.report.controller;

import com.back.auth.application.OidcAuthorizeProperties;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.global.security.adapter.in.JwtAuthenticationFilter;
import com.back.global.security.config.SecurityConfig;
import com.back.global.security.handler.OAuth2LoginSuccessHandler;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtProperties;
import com.back.global.security.jwt.JwtTokenService;
import com.back.report.dto.ReportHandleRequest;
import com.back.report.dto.ReportListResponse;
import com.back.report.service.ReportService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken; // 추가
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication; // 중요
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminReportController.class)
@Import({
        SecurityConfig.class,
        SecurityAccessDeniedHandler.class,
        SecurityAuthenticationEntryPoint.class
})
class AdminReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ReportService reportService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtTokenService jwtTokenService;

    @MockitoBean
    private JwtProperties jwtProperties;

    @MockitoBean
    private OidcAuthorizeProperties oidcAuthorizeProperties;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private ClientRegistrationRepository clientRegistrationRepository;

    private UsernamePasswordAuthenticationToken adminAuth;
    private UsernamePasswordAuthenticationToken userAuth;

    @BeforeEach
    void setup() throws ServletException, IOException {
        // 1. 필터 통과 설정
        doAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            HttpServletResponse response = invocation.getArgument(1);
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(request, response);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        // 2. 관리자 인증 객체 생성 (ReportControllerTest 방식 적용)
        AuthenticatedMember adminMember = new AuthenticatedMember(1L, "admin@test.com", List.of("ROLE_ADMIN"));
        adminAuth = new UsernamePasswordAuthenticationToken(adminMember, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        // 3. 일반 유저 인증 객체 생성
        AuthenticatedMember userMember = new AuthenticatedMember(2L, "user@test.com", List.of("ROLE_USER"));
        userAuth = new UsernamePasswordAuthenticationToken(userMember, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        public ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

    @Test
    @DisplayName("[GET] 관리자는 신고 목록을 조회할 수 있다")
    void getReports_Success() throws Exception {
        ReportListResponse response = new ReportListResponse(
                1L, "신고자", "POST", 100L, "욕설", "RECEIVED", LocalDateTime.now());
        given(reportService.getReports()).willReturn(List.of(response));

        mockMvc.perform(get("/api/v1/admin/reports")
                        .with(authentication(adminAuth))) // 직접 주입
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-1"));
    }

    @Test
    @DisplayName("[POST] 관리자는 신고를 처리할 수 있다")
    void handleReport_Success() throws Exception {
        Long reportId = 1L;
        ReportHandleRequest request = new ReportHandleRequest("DELETE", "확인됨", true, "게시글 삭제 알림");

        mockMvc.perform(post("/api/v1/admin/reports/{id}/handle", reportId)
                        .with(authentication(adminAuth)) // 직접 주입
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-3"));
    }

    @Test
    @DisplayName("일반 유저는 관리자 API를 호출할 수 없다 (403 Forbidden)")
    void getReports_Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reports")
                        .with(authentication(userAuth))) // 일반 유저로 시도
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.resultCode").value("403-1"));
    }
}