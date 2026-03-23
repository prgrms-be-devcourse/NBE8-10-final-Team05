package com.back.member.adapter.in.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.application.MemberService;
import java.util.List;
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

@WebMvcTest(MemberController.class)
@Import({
  com.back.global.aspect.ResponseAspect.class,
  com.back.global.security.config.SecurityConfig.class,
  com.back.global.security.handler.SecurityAccessDeniedHandler.class,
  com.back.global.security.handler.SecurityAuthenticationEntryPoint.class
})
@ActiveProfiles("test")
@DisplayName("회원 컨트롤러 API 테스트")
class MemberControllerTest {

  @Autowired private MockMvc mockMvc;

  @Autowired private ObjectMapper objectMapper;

  @MockitoBean private MemberService memberService;
  @MockitoBean private JwtTokenService jwtTokenService;

  @Test
  @DisplayName("회원 가입 API는 회원 정보를 생성한다")
  void createMember() throws Exception {
    CreateMemberRequest request =
        new CreateMemberRequest("member1@test.com", "pass1234", "member1");
    MemberResponse response = new MemberResponse(1L, "member1@test.com", "member1");

    given(memberService.createMember(any(CreateMemberRequest.class))).willReturn(response);

    mockMvc
        .perform(
            post("/api/v1/members")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("201-1"))
        .andExpect(jsonPath("$.msg").value("Member created."))
        .andExpect(jsonPath("$.data.id").value(1))
        .andExpect(jsonPath("$.data.email").value("member1@test.com"))
        .andExpect(jsonPath("$.data.nickname").value("member1"));
  }

  @Test
  @DisplayName("관리자는 memberId 기반 회원 조회 API를 사용할 수 있다")
  void getMember() throws Exception {
    MemberResponse response = new MemberResponse(2L, "member2@test.com", "member2");
    given(memberService.getMember(2L)).willReturn(response);

    mockMvc
        .perform(get("/api/v1/members/{memberId}", 2).with(user("admin").roles("ADMIN")))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("200-1"))
        .andExpect(jsonPath("$.msg").value("Member fetched."))
        .andExpect(jsonPath("$.data.id").value(2))
        .andExpect(jsonPath("$.data.email").value("member2@test.com"))
        .andExpect(jsonPath("$.data.nickname").value("member2"));
  }

  @Test
  @DisplayName("본인 프로필 수정 API는 인증된 사용자 기준으로 닉네임을 변경한다")
  void updateProfile() throws Exception {
    UpdateMemberProfileRequest request = new UpdateMemberProfileRequest("updatedMember");
    MemberResponse response = new MemberResponse(3L, "member3@test.com", "updatedMember");
    given(memberService.updateProfile(3L, request)).willReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/members/me/profile")
                .with(authentication(authenticatedMember(3L, "member3@test.com")))
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("200-2"))
        .andExpect(jsonPath("$.msg").value("Member profile updated."))
        .andExpect(jsonPath("$.data.id").value(3))
        .andExpect(jsonPath("$.data.email").value("member3@test.com"))
        .andExpect(jsonPath("$.data.nickname").value("updatedMember"));
  }

  @Test
  @DisplayName("본인 회원 조회 API는 인증된 사용자 기준으로 정보를 반환한다")
  void getMyMember() throws Exception {
    MemberResponse response = new MemberResponse(7L, "member7@test.com", "member7");
    given(memberService.getMember(7L)).willReturn(response);

    mockMvc
        .perform(
            get("/api/v1/members/me")
                .with(authentication(authenticatedMember(7L, "member7@test.com"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-1"))
        .andExpect(jsonPath("$.data.id").value(7))
        .andExpect(jsonPath("$.data.email").value("member7@test.com"));
  }

  @Test
  @DisplayName("인증 없이 /members/me 호출 시 401을 반환한다")
  void getMyMemberWithoutAuthenticationReturns401() throws Exception {
    mockMvc
        .perform(get("/api/v1/members/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"))
        .andExpect(jsonPath("$.msg").value("Authentication is required."));
  }

  @Test
  @DisplayName("일반 사용자는 memberId 기반 타인 프로필 수정 API에 접근하면 403을 받는다")
  void updateOtherProfileWithUserRoleReturns403() throws Exception {
    UpdateMemberProfileRequest request = new UpdateMemberProfileRequest("updatedMember");

    mockMvc
        .perform(
            patch("/api/v1/members/{memberId}/profile", 3)
                .with(user("member").roles("USER"))
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-1"))
        .andExpect(jsonPath("$.msg").value("You do not have permission."));
  }

  @Test
  @DisplayName("관리자는 memberId 기반 타인 프로필 수정 API를 사용할 수 있다")
  void adminCanUpdateOtherProfile() throws Exception {
    UpdateMemberProfileRequest request = new UpdateMemberProfileRequest("updatedByAdmin");
    MemberResponse response = new MemberResponse(9L, "member9@test.com", "updatedByAdmin");
    given(memberService.updateProfile(9L, request)).willReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/members/{memberId}/profile", 9L)
                .with(user("admin").roles("ADMIN"))
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-2"))
        .andExpect(jsonPath("$.data.id").value(9))
        .andExpect(jsonPath("$.data.nickname").value("updatedByAdmin"));
  }

  @Test
  @DisplayName("인증 없이 /members/me/profile 호출 시 401을 반환한다")
  void updateMyProfileWithoutAuthenticationReturns401() throws Exception {
    UpdateMemberProfileRequest request = new UpdateMemberProfileRequest("updatedMember");

    mockMvc
        .perform(
            patch("/api/v1/members/me/profile")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"))
        .andExpect(jsonPath("$.msg").value("Authentication is required."));
  }

  private UsernamePasswordAuthenticationToken authenticatedMember(Long memberId, String email) {
    AuthenticatedMember principal = new AuthenticatedMember(memberId, email, List.of("ROLE_USER"));
    return new UsernamePasswordAuthenticationToken(
        principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
  }
}
