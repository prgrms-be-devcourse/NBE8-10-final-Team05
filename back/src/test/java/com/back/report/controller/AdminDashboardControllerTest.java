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
import com.back.report.dto.AdminDashboardStatsResponse;
import com.back.report.service.ReportService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminDashboardController.class)
@Import({
        SecurityConfig.class,
        SecurityAccessDeniedHandler.class,
        SecurityAuthenticationEntryPoint.class
})
class AdminDashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

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
        doAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            HttpServletResponse response = invocation.getArgument(1);
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(request, response);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        AuthenticatedMember adminMember =
                new AuthenticatedMember(1L, "admin@test.com", List.of("ROLE_ADMIN"));
        adminAuth = new UsernamePasswordAuthenticationToken(
                adminMember, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        AuthenticatedMember userMember =
                new AuthenticatedMember(2L, "user@test.com", List.of("ROLE_USER"));
        userAuth = new UsernamePasswordAuthenticationToken(
                userMember, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
            return new com.fasterxml.jackson.databind.ObjectMapper();
        }
    }

    @Test
    @DisplayName("관리자는 대시보드 집계 통계를 조회할 수 있다")
    void getDashboardStats_success() throws Exception {
        given(reportService.getDashboardStats())
                .willReturn(new AdminDashboardStatsResponse(3, 4, 5, 6, 7, 8));

        mockMvc.perform(get("/api/v1/admin/dashboard/stats").with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-1"))
                .andExpect(jsonPath("$.data.todayReportsCount").value(3))
                .andExpect(jsonPath("$.data.todayLettersCount").value(6));
    }

    @Test
    @DisplayName("일반 유저는 관리자 대시보드 통계를 조회할 수 없다")
    void getDashboardStats_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/stats").with(authentication(userAuth)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.resultCode").value("403-1"));
    }
}
