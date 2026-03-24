package com.back.global.security.config;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.global.security.jwt.JwtTokenService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import com.google.genai.Client;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("시큐리티 통합 테스트")
class SecurityIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private MemberRepository memberRepository;
  @Autowired private JwtTokenService jwtTokenService;
  @Autowired private PasswordEncoder passwordEncoder;
  @MockitoBean private Client geminiClient;

  @Test
  @DisplayName("공개 회원가입 API는 토큰 없이도 정상 동작한다")
  void signupEndpointRemainsPublic() throws Exception {
    String uniqueEmail = "signup-" + UUID.randomUUID() + "@test.com";
    String requestBody =
        objectMapper.writeValueAsString(
            new AuthSignupIntegrationRequest(uniqueEmail, "plain-pass-1234", "signup-user"));

    mockMvc
        .perform(post("/api/v1/auth/signup").contentType(APPLICATION_JSON).content(requestBody))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("201-2"))
        .andExpect(jsonPath("$.data.email").value(uniqueEmail));
  }

  @Test
  @DisplayName("보호 API를 토큰 없이 호출하면 실제 컨텍스트에서도 401을 반환한다")
  void protectedRouteWithoutTokenReturns401() throws Exception {
    mockMvc
        .perform(get("/api/v1/members/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"))
        .andExpect(jsonPath("$.msg").value("Authentication is required."));
  }

  @Test
  @DisplayName("차단된 회원의 기존 access 토큰은 실제 컨텍스트에서도 401을 반환한다")
  void blockedMemberAccessTokenReturns401() throws Exception {
    Member member = createMember(MemberRole.USER, MemberStatus.ACTIVE);
    String accessToken =
        jwtTokenService.generateAccessToken(member.getId(), member.getEmail(), List.of("ROLE_USER"));

    ReflectionTestUtils.setField(member, "status", MemberStatus.BLOCKED);
    memberRepository.saveAndFlush(member);

    mockMvc
        .perform(get("/api/v1/members/me").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"))
        .andExpect(jsonPath("$.msg").value("Authentication is required."));
  }

  @Test
  @DisplayName("관리자 권한이 제거된 회원의 기존 admin access 토큰은 실제 컨텍스트에서도 403을 반환한다")
  void downgradedAdminTokenReturns403() throws Exception {
    Member member = createMember(MemberRole.ADMIN, MemberStatus.ACTIVE);
    String accessToken =
        jwtTokenService.generateAccessToken(
            member.getId(), member.getEmail(), List.of("ROLE_ADMIN"));

    ReflectionTestUtils.setField(member, "role", MemberRole.USER);
    memberRepository.saveAndFlush(member);

    mockMvc
        .perform(
            get("/api/v1/admin/protected").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-1"))
        .andExpect(jsonPath("$.msg").value("You do not have permission."));
  }

  @Test
  @DisplayName("허용 목록에 없는 새 경로는 인증된 사용자여도 실제 컨텍스트에서 403을 반환한다")
  void nonWhitelistedRouteReturns403ForAuthenticatedUser() throws Exception {
    Member member = createMember(MemberRole.USER, MemberStatus.ACTIVE);
    String accessToken =
        jwtTokenService.generateAccessToken(member.getId(), member.getEmail(), List.of("ROLE_USER"));

    mockMvc
        .perform(get("/api/v2/preview").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-1"))
        .andExpect(jsonPath("$.msg").value("You do not have permission."));
  }

  @Test
  @DisplayName("OIDC authorize 경로는 토큰 없이도 리다이렉트 응답을 반환한다")
  void oidcAuthorizeRemainsPublic() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/auth/oidc/authorize/maum-on-oidc")
                .param("redirect_uri", "http://localhost:3000/login"))
        .andExpect(status().is3xxRedirection())
        .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("accounts.google.com")));
  }

  private Member createMember(MemberRole role, MemberStatus status) {
    String unique = UUID.randomUUID().toString().replace("-", "");
    Member member =
        Member.create(
            "member-" + unique + "@test.com",
            passwordEncoder.encode("plain-pass-1234"),
            "member-" + unique.substring(0, 8));
    ReflectionTestUtils.setField(member, "role", role);
    ReflectionTestUtils.setField(member, "status", status);
    return memberRepository.saveAndFlush(member);
  }

  private String bearer(String accessToken) {
    return "Bearer " + accessToken;
  }

  private record AuthSignupIntegrationRequest(String email, String password, String nickname) {}
}
