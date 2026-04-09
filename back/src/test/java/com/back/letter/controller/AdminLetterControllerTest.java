package com.back.letter.controller;

import com.back.auth.application.OidcAuthorizeProperties;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.global.security.adapter.in.JwtAuthenticationFilter;
import com.back.global.security.config.SecurityConfig;
import com.back.global.security.handler.OAuth2LoginSuccessHandler;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtProperties;
import com.back.global.security.jwt.JwtTokenService;
import com.back.letter.adapter.in.web.AdminLetterController;
import com.back.letter.application.port.in.AdminLetterUseCase;
import com.back.letter.application.port.in.dto.AdminLetterDetailRes;
import com.back.letter.application.port.in.dto.AdminLetterListItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
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

@WebMvcTest(AdminLetterController.class)
@Import({
        SecurityConfig.class,
        SecurityAccessDeniedHandler.class,
        SecurityAuthenticationEntryPoint.class
})
class AdminLetterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminLetterUseCase adminLetterUseCase;

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

        AuthenticatedMember adminMember = new AuthenticatedMember(1L, "admin@test.com", List.of("ROLE_ADMIN"));
        adminAuth = new UsernamePasswordAuthenticationToken(
                adminMember, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        AuthenticatedMember userMember = new AuthenticatedMember(2L, "user@test.com", List.of("ROLE_USER"));
        userAuth = new UsernamePasswordAuthenticationToken(
                userMember, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        public ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

    @Test
    @DisplayName("[GET] 관리자는 비밀편지 목록을 조회할 수 있다")
    void getLettersSuccess() throws Exception {
        given(adminLetterUseCase.getAdminLetters()).willReturn(List.of(
                new AdminLetterListItem(
                        7L,
                        "안부",
                        "보낸사람",
                        "받는사람",
                        "SENT",
                        LocalDateTime.of(2026, 4, 9, 12, 30),
                        null)));

        mockMvc.perform(get("/api/v1/admin/letters").with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-1"))
                .andExpect(jsonPath("$.data[0].letterId").value(7L));
    }

    @Test
    @DisplayName("[GET] 관리자는 비밀편지 상세를 조회할 수 있다")
    void getLetterDetailSuccess() throws Exception {
        given(adminLetterUseCase.getAdminLetter(9L)).willReturn(
                new AdminLetterDetailRes(
                        9L,
                        "위로",
                        "오늘 힘들었어요.",
                        "하루의 고단함을 털어놓은 편지",
                        "천천히 쉬어가요.",
                        "휴식을 권하는 답장",
                        "REPLIED",
                        LocalDateTime.of(2026, 4, 9, 10, 0),
                        LocalDateTime.of(2026, 4, 9, 10, 30),
                        new AdminLetterDetailRes.AdminLetterMemberSummary(1L, "보낸이"),
                        new AdminLetterDetailRes.AdminLetterMemberSummary(2L, "받는이")));

        mockMvc.perform(get("/api/v1/admin/letters/{id}", 9L).with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-2"))
                .andExpect(jsonPath("$.data.sender.nickname").value("보낸이"));
    }

    @Test
    @DisplayName("일반 유저는 관리자 편지 API를 호출할 수 없다")
    void getLettersForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/letters").with(authentication(userAuth)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.resultCode").value("403-1"));
    }
}
