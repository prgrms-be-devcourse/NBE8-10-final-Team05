package com.back.member.adapter.in.web;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.global.aspect.ResponseAspect;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.adapter.in.web.dto.AdminMemberDetailResponse;
import com.back.member.adapter.in.web.dto.AdminMemberListItem;
import com.back.member.adapter.in.web.dto.AdminMemberListResponse;
import com.back.member.application.MemberService;
import com.back.member.domain.MemberRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminMemberController.class)
@Import({
  ResponseAspect.class,
  com.back.global.security.config.SecurityConfig.class,
  SecurityAuthenticationEntryPoint.class,
  SecurityAccessDeniedHandler.class
})
@ActiveProfiles("test")
@DisplayName("관리자 회원 컨트롤러 API 테스트")
class AdminMemberControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private MemberService memberService;
  @MockitoBean private JwtTokenService jwtTokenService;
  @MockitoBean private MemberRepository memberRepository;

  private UsernamePasswordAuthenticationToken adminAuth() {
    AuthenticatedMember adminMember =
        new AuthenticatedMember(1L, "admin@test.com", List.of("ROLE_ADMIN"));
    return new UsernamePasswordAuthenticationToken(
        adminMember, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
  }

  @Test
  @DisplayName("관리자는 회원 목록을 검색/필터 조건과 함께 조회할 수 있다")
  void getMembers() throws Exception {
    AdminMemberListResponse response =
        new AdminMemberListResponse(
            List.of(
                new AdminMemberListItem(
                    7L,
                    "member7@test.com",
                    "member7",
                    "USER",
                    "ACTIVE",
                    true,
                    true,
                    LocalDateTime.of(2026, 4, 9, 12, 0),
                    LocalDateTime.of(2026, 4, 9, 13, 0))),
            3,
            41,
            1,
            false,
            false);

    given(memberService.getAdminMembers("member7", "ACTIVE", "USER", "SOCIAL", 1, 20))
        .willReturn(response);

    mockMvc
        .perform(
            get("/api/v1/admin/members")
                .param("query", "member7")
                .param("status", "ACTIVE")
                .param("role", "USER")
                .param("provider", "SOCIAL")
                .param("page", "1")
                .param("size", "20")
                .with(user("admin").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-7"))
        .andExpect(jsonPath("$.data.members[0].id").value(7L))
        .andExpect(jsonPath("$.data.members[0].status").value("ACTIVE"))
        .andExpect(jsonPath("$.data.totalElements").value(41))
        .andExpect(jsonPath("$.data.currentPage").value(1));
  }

  @Test
  @DisplayName("관리자는 회원 상세를 조회할 수 있다")
  void getMemberDetail() throws Exception {
    AdminMemberDetailResponse response =
        new AdminMemberDetailResponse(
            9L,
            "member9@test.com",
            "member9",
            "ADMIN",
            "ACTIVE",
            true,
            true,
            LocalDateTime.of(2026, 4, 1, 9, 0),
            LocalDateTime.of(2026, 4, 9, 14, 30),
            LocalDateTime.of(2026, 4, 9, 8, 45),
            List.of("google", "kakao"),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of());

    given(memberService.getAdminMemberDetail(9L)).willReturn(response);

    mockMvc
        .perform(get("/api/v1/admin/members/{memberId}", 9L).with(user("admin").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-8"))
        .andExpect(jsonPath("$.data.email").value("member9@test.com"))
        .andExpect(jsonPath("$.data.role").value("ADMIN"))
        .andExpect(jsonPath("$.data.connectedProviders[0]").value("google"));
  }

  @Test
  @DisplayName("관리자는 회원 상태를 변경할 수 있다")
  void updateMemberStatus() throws Exception {
    AdminMemberDetailResponse response =
        new AdminMemberDetailResponse(
            9L,
            "member9@test.com",
            "member9",
            "USER",
            "BLOCKED",
            false,
            false,
            LocalDateTime.of(2026, 4, 1, 9, 0),
            LocalDateTime.of(2026, 4, 9, 15, 0),
            null,
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of());

    given(memberService.updateAdminMemberStatus(
            9L,
            1L,
            new com.back.member.adapter.in.web.dto.AdminUpdateMemberStatusRequest(
                "BLOCKED", "운영 정책 위반", true)))
        .willReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/admin/members/{memberId}/status", 9L)
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"status":"BLOCKED","reason":"운영 정책 위반","revokeSessions":true}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-10"))
        .andExpect(jsonPath("$.data.status").value("BLOCKED"));
  }

  @Test
  @DisplayName("관리자는 회원 세션을 만료할 수 있다")
  void revokeMemberSessions() throws Exception {
    AdminMemberDetailResponse response =
        new AdminMemberDetailResponse(
            12L,
            "member12@test.com",
            "member12",
            "USER",
            "ACTIVE",
            true,
            false,
            LocalDateTime.of(2026, 4, 1, 9, 0),
            LocalDateTime.of(2026, 4, 9, 15, 0),
            null,
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of());

    given(memberService.revokeAdminMemberSessions(
            12L,
            1L,
            new com.back.member.adapter.in.web.dto.AdminRevokeMemberSessionsRequest("세션 정리")))
        .willReturn(response);

    mockMvc
        .perform(
            post("/api/v1/admin/members/{memberId}/sessions/revoke", 12L)
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"세션 정리\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-12"))
        .andExpect(jsonPath("$.data.id").value(12L));
  }

  @Test
  @DisplayName("일반 사용자는 관리자 회원 API를 호출할 수 없다")
  void getMembersForbidden() throws Exception {
    mockMvc
        .perform(get("/api/v1/admin/members").with(user("member").roles("USER")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-1"));
  }
}
