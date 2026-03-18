package com.back.member.adapter.in.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.application.MemberService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
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
@DisplayName("회원 컨트롤러 API 테스트")
class MemberControllerTest {

  @Autowired private MockMvc mockMvc;

  @Autowired private ObjectMapper objectMapper;

  @MockitoBean private MemberService memberService;

  @Test
  @DisplayName("회원 가입 API는 회원 정보를 생성한다")
  void createMember() throws Exception {
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
        .andExpect(jsonPath("$.resultCode").value("201-1"))
        .andExpect(jsonPath("$.msg").value("Member created."))
        .andExpect(jsonPath("$.data.id").value(1))
        .andExpect(jsonPath("$.data.email").value("member1@test.com"))
        .andExpect(jsonPath("$.data.nickname").value("member1"));
  }

  @Test
  @DisplayName("회원 조회 API는 회원 정보를 반환한다")
  void getMember() throws Exception {
    MemberResponse response = new MemberResponse(2, "member2@test.com", "member2");
    given(memberService.getMember(2)).willReturn(response);

    mockMvc
        .perform(get("/api/v1/members/{memberId}", 2).with(user("member")))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("200-1"))
        .andExpect(jsonPath("$.msg").value("Member fetched."))
        .andExpect(jsonPath("$.data.id").value(2))
        .andExpect(jsonPath("$.data.email").value("member2@test.com"))
        .andExpect(jsonPath("$.data.nickname").value("member2"));
  }

  @Test
  @DisplayName("회원 프로필 수정 API는 닉네임을 변경한다")
  void updateProfile() throws Exception {
    UpdateMemberProfileRequest request = new UpdateMemberProfileRequest("updatedMember");
    MemberResponse response = new MemberResponse(3, "member3@test.com", "updatedMember");
    given(memberService.updateProfile(any(Integer.class), any(UpdateMemberProfileRequest.class)))
        .willReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/members/{memberId}/profile", 3)
                .with(user("member"))
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().is2xxSuccessful())
        .andExpect(jsonPath("$.resultCode").value("200-2"))
        .andExpect(jsonPath("$.msg").value("Member profile updated."))
        .andExpect(jsonPath("$.data.id").value(3))
        .andExpect(jsonPath("$.data.email").value("member3@test.com"))
        .andExpect(jsonPath("$.data.nickname").value("updatedMember"));
  }
}
