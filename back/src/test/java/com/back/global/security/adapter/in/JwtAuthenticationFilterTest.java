package com.back.global.security.adapter.in;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.back.global.security.jwt.JwtSubject;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("JWT 인증 필터 테스트")
class JwtAuthenticationFilterTest {

  @Mock private JwtTokenService jwtTokenService;
  @Mock private MemberRepository memberRepository;

  @InjectMocks private JwtAuthenticationFilter jwtAuthenticationFilter;

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  @DisplayName("활성 회원이면 access 토큰 클레임이 아니라 현재 DB role 기준으로 인증을 구성한다")
  void authenticatesUsingCurrentDbRole() throws Exception {
    Member activeMember =
        memberWithIdAndPolicy(1L, "member@test.com", MemberRole.USER, MemberStatus.ACTIVE);
    given(jwtTokenService.validate("stale-admin-access-token")).willReturn(true);
    given(jwtTokenService.parseAccessToken("stale-admin-access-token"))
        .willReturn(new JwtSubject(1L, "member@test.com", List.of("ROLE_ADMIN")));
    given(memberRepository.findById(1L)).willReturn(Optional.of(activeMember));

    doFilter("Bearer stale-admin-access-token");

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    assertThat(authentication).isNotNull();
    assertThat(authentication.getAuthorities())
        .extracting(grantedAuthority -> grantedAuthority.getAuthority())
        .containsExactly("ROLE_USER");
    assertThat(authentication.getPrincipal())
        .isEqualTo(new AuthenticatedMember(1L, "member@test.com", List.of("ROLE_USER")));
  }

  @Test
  @DisplayName("차단된 회원이면 인증을 구성하지 않는다")
  void blockedMemberDoesNotAuthenticate() throws Exception {
    Member blockedMember =
        memberWithIdAndPolicy(2L, "blocked@test.com", MemberRole.USER, MemberStatus.BLOCKED);
    given(jwtTokenService.validate("blocked-access-token")).willReturn(true);
    given(jwtTokenService.parseAccessToken("blocked-access-token"))
        .willReturn(new JwtSubject(2L, "blocked@test.com", List.of("ROLE_USER")));
    given(memberRepository.findById(2L)).willReturn(Optional.of(blockedMember));

    doFilter("Bearer blocked-access-token");

    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  @DisplayName("탈퇴한 회원이면 인증을 구성하지 않는다")
  void withdrawnMemberDoesNotAuthenticate() throws Exception {
    Member withdrawnMember =
        memberWithIdAndPolicy(3L, "withdrawn@test.com", MemberRole.USER, MemberStatus.WITHDRAWN);
    given(jwtTokenService.validate("withdrawn-access-token")).willReturn(true);
    given(jwtTokenService.parseAccessToken("withdrawn-access-token"))
        .willReturn(new JwtSubject(3L, "withdrawn@test.com", List.of("ROLE_USER")));
    given(memberRepository.findById(3L)).willReturn(Optional.of(withdrawnMember));

    doFilter("Bearer withdrawn-access-token");

    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  @DisplayName("회원이 없으면 인증을 구성하지 않는다")
  void missingMemberDoesNotAuthenticate() throws Exception {
    given(jwtTokenService.validate("missing-member-token")).willReturn(true);
    given(jwtTokenService.parseAccessToken("missing-member-token"))
        .willReturn(new JwtSubject(4L, "missing@test.com", List.of("ROLE_USER")));
    given(memberRepository.findById(4L)).willReturn(Optional.empty());

    doFilter("Bearer missing-member-token");

    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  @DisplayName("유효하지 않은 access 토큰이면 인증을 구성하지 않고 회원 조회도 하지 않는다")
  void invalidTokenDoesNotAuthenticate() throws Exception {
    given(jwtTokenService.validate("invalid-access-token")).willReturn(false);

    doFilter("Bearer invalid-access-token");

    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    then(memberRepository).should(never()).findById(org.mockito.ArgumentMatchers.anyLong());
  }

  @Test
  @DisplayName("이미 인증이 있어도 Bearer access 토큰이 있으면 현재 토큰 기준으로 다시 인증한다")
  void existingAuthenticationIsOverriddenByBearerToken() throws Exception {
    Authentication existingAuthentication =
        new UsernamePasswordAuthenticationToken(
            new AuthenticatedMember(99L, "existing@test.com", List.of("ROLE_USER")),
            "existing-token",
            List.of(new SimpleGrantedAuthority("ROLE_USER")));
    SecurityContextHolder.getContext().setAuthentication(existingAuthentication);
    Member currentMember =
        memberWithIdAndPolicy(5L, "current@test.com", MemberRole.USER, MemberStatus.ACTIVE);
    given(jwtTokenService.validate("current-access-token")).willReturn(true);
    given(jwtTokenService.parseAccessToken("current-access-token"))
        .willReturn(new JwtSubject(5L, "current@test.com", List.of("ROLE_USER")));
    given(memberRepository.findById(5L)).willReturn(Optional.of(currentMember));

    doFilter("Bearer current-access-token");

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    assertThat(authentication).isNotNull();
    assertThat(authentication).isNotSameAs(existingAuthentication);
    assertThat(authentication.getPrincipal())
        .isEqualTo(new AuthenticatedMember(5L, "current@test.com", List.of("ROLE_USER")));
  }

  @Test
  @DisplayName("Authorization 헤더가 없으면 기존 SecurityContext를 유지한다")
  void existingAuthenticationIsPreservedWithoutBearerToken() throws Exception {
    Authentication existingAuthentication =
        new UsernamePasswordAuthenticationToken(
            new AuthenticatedMember(99L, "existing@test.com", List.of("ROLE_USER")),
            "existing-token",
            List.of(new SimpleGrantedAuthority("ROLE_USER")));
    SecurityContextHolder.getContext().setAuthentication(existingAuthentication);

    doFilter(null);

    assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(existingAuthentication);
    then(jwtTokenService).shouldHaveNoInteractions();
    then(memberRepository).shouldHaveNoInteractions();
  }

  @Test
  @DisplayName("Bearer 형식이 아닌 Authorization 헤더는 인증 시도를 하지 않는다")
  void malformedAuthorizationHeaderDoesNotAuthenticate() throws Exception {
    doFilter("Basic abcdefg");

    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    then(jwtTokenService).shouldHaveNoInteractions();
    then(memberRepository).shouldHaveNoInteractions();
  }

  private void doFilter(String authorizationHeader) throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    if (authorizationHeader != null) {
      request.addHeader(HttpHeaders.AUTHORIZATION, authorizationHeader);
    }
    MockHttpServletResponse response = new MockHttpServletResponse();

    jwtAuthenticationFilter.doFilter(request, response, new MockFilterChain());
  }

  private Member memberWithIdAndPolicy(
      Long id, String email, MemberRole role, MemberStatus status) {
    Member member = Member.create(email, "$2a$10$hashed", "member");
    ReflectionTestUtils.setField(member, "id", id);
    ReflectionTestUtils.setField(member, "role", role);
    ReflectionTestUtils.setField(member, "status", status);
    return member;
  }
}
