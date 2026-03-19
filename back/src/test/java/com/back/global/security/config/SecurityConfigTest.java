package com.back.global.security.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.global.aspect.ResponseAspect;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.adapter.in.web.MemberController;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.application.MemberService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@WebMvcTest(MemberController.class)
@Import({
  ResponseAspect.class,
  SecurityConfig.class,
  SecurityAuthenticationEntryPoint.class,
  SecurityAccessDeniedHandler.class
})
@DisplayName("시큐리티 경로 권한 설정 테스트")
class SecurityConfigTest {

  @Autowired private MockMvc mockMvc;

  @Autowired private ObjectMapper objectMapper;

  @MockitoBean private MemberService memberService;
  @MockitoBean private JwtTokenService jwtTokenService;

  @Test
  @DisplayName("공개 API는 토큰 없이 접근 가능하다")
  void publicApiWorksWithoutToken() throws Exception {
    CreateMemberRequest request =
        new CreateMemberRequest("member1@test.com", "pass1234", "member1");
    MemberResponse response = new MemberResponse(1, "member1@test.com", "member1");
    given(memberService.createMember(any(CreateMemberRequest.class))).willReturn(response);

    mockMvc
        .perform(
            post("/api/v1/members")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("201-1"));
  }

  @Test
  @DisplayName("보호 API를 토큰 없이 호출하면 401을 반환한다")
  void protectedApiWithoutTokenReturns401() throws Exception {
    mockMvc
        .perform(get("/api/v1/members/{memberId}", 1))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"))
        .andExpect(jsonPath("$.msg").value("Authentication is required."));
  }

  @Test
  @DisplayName("관리자 API를 USER 권한으로 호출하면 403을 반환한다")
  void adminApiWithUserRoleReturns403() throws Exception {
    mockMvc
        .perform(get("/api/v1/admin/protected").with(user("member").roles("USER")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-1"))
        .andExpect(jsonPath("$.msg").value("You do not have permission."));
  }

  @Test
  @DisplayName("만료된 액세스 토큰으로 보호 API를 호출하면 401을 반환한다")
  void expiredAccessTokenReturns401() throws Exception {
    given(jwtTokenService.validate("expired-access-token")).willReturn(false);

    mockMvc
        .perform(
            get("/api/v1/members/{memberId}", 1)
                .header(HttpHeaders.AUTHORIZATION, "Bearer expired-access-token"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"))
        .andExpect(jsonPath("$.msg").value("Authentication is required."));
  }
}
