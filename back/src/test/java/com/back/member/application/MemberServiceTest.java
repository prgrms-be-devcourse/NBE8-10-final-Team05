package com.back.member.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;

import com.back.auth.domain.RefreshTokenDomainService;
import com.back.global.exception.ServiceException;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberEmailRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberPasswordRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("회원 서비스 비밀번호 처리 테스트")
class MemberServiceTest {

  @Mock private MemberRepository memberRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private RefreshTokenDomainService refreshTokenDomainService;
  @Mock private Clock clock;

  @InjectMocks private MemberService memberService;

  @BeforeEach
  void setUpClock() {
    lenient().when(clock.getZone()).thenReturn(ZoneOffset.UTC);
    lenient().when(clock.instant()).thenReturn(Instant.parse("2026-03-27T00:00:00Z"));
  }

  @Test
  @DisplayName("회원 생성 시 비밀번호 원문이 아닌 해시만 저장한다")
  void createMemberStoresPasswordHashOnly() {
    String rawPassword = "plain-password";
    String passwordHash = "$2a$10$hashValue";
    CreateMemberRequest request =
        new CreateMemberRequest("member1@test.com", rawPassword, "member1");

    given(memberRepository.existsByEmail("member1@test.com")).willReturn(false);
    given(passwordEncoder.encode(rawPassword)).willReturn(passwordHash);
    given(memberRepository.save(any(Member.class)))
        .willAnswer(invocation -> invocation.getArgument(0));

    memberService.createMember(request);

    ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
    then(memberRepository).should().save(captor.capture());
    Member saved = captor.getValue();

    assertThat(saved.getPasswordHash()).isEqualTo(passwordHash);
    assertThat(saved.getPasswordHash()).isNotEqualTo(rawPassword);
    then(passwordEncoder).should().encode(rawPassword);
  }

  @Test
  @DisplayName("비밀번호 비교는 PasswordEncoder.matches를 사용한다")
  void passwordComparisonUsesPasswordEncoderMatches() {
    Member member = Member.create("member2@test.com", "$2a$10$hashValue", "member2");
    String rawPassword = "plain-password";

    given(passwordEncoder.matches(rawPassword, "$2a$10$hashValue")).willReturn(true);

    boolean result = member.matchesPassword(rawPassword, passwordEncoder);

    assertThat(result).isTrue();
    then(passwordEncoder).should().matches(rawPassword, "$2a$10$hashValue");
  }

  @Test
  @DisplayName("회원 생성 시 이메일이 중복이면 409-1 예외를 반환한다")
  void createMemberFailsWhenEmailDuplicated() {
    CreateMemberRequest request = new CreateMemberRequest("dup@test.com", "plain-password", "dup");
    given(memberRepository.existsByEmail("dup@test.com")).willReturn(true);

    assertThatThrownBy(() -> memberService.createMember(request))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("409-1"));

    then(passwordEncoder).should(never()).encode(any(String.class));
  }

  @Test
  @DisplayName("회원 생성 시 이메일이 비어 있으면 400-1 예외를 반환한다")
  void createMemberFailsWhenEmailBlank() {
    CreateMemberRequest request = new CreateMemberRequest("   ", "plain-password", "member");

    assertThatThrownBy(() -> memberService.createMember(request))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("400-1"));
  }

  @Test
  @DisplayName("회원 생성 시 비밀번호가 비어 있으면 400-1 예외를 반환한다")
  void createMemberFailsWhenPasswordBlank() {
    CreateMemberRequest request = new CreateMemberRequest("member@test.com", "   ", "member");
    given(memberRepository.existsByEmail("member@test.com")).willReturn(false);

    assertThatThrownBy(() -> memberService.createMember(request))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("400-1"));
  }

  @Test
  @DisplayName("존재하지 않는 회원 조회 시 404-1 예외를 반환한다")
  void getMemberFailsWhenNotFound() {
    given(memberRepository.findById(99L)).willReturn(Optional.empty());

    assertThatThrownBy(() -> memberService.getMember(99L))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("404-1"));
  }

  @Test
  @DisplayName("존재하지 않는 회원 프로필 수정 시 404-1 예외를 반환한다")
  void updateProfileFailsWhenNotFound() {
    given(memberRepository.findById(100L)).willReturn(Optional.empty());

    assertThatThrownBy(
            () -> memberService.updateProfile(100L, new UpdateMemberProfileRequest("changed")))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("404-1"));
  }

  @Test
  @DisplayName("프로필 닉네임을 빈 값으로 수정하면 anonymous로 보정된다")
  void updateProfileBlankNicknameFallsBackToAnonymous() {
    Member member = Member.create("member3@test.com", "$2a$10$hashValue", "member3");
    ReflectionTestUtils.setField(member, "id", 3L);
    given(memberRepository.findById(3L)).willReturn(Optional.of(member));

    var response = memberService.updateProfile(3L, new UpdateMemberProfileRequest("   "));

    assertThat(response.nickname()).isEqualTo("anonymous");
  }

  @Test
  @DisplayName("이메일 변경 시 정규화된 이메일이 저장된다")
  void updateEmailNormalizesAndStoresEmail() {
    Member member = Member.create("member4@test.com", "$2a$10$hashValue", "member4");
    ReflectionTestUtils.setField(member, "id", 4L);
    given(memberRepository.findById(4L)).willReturn(Optional.of(member));
    given(memberRepository.findByEmail("changed@test.com")).willReturn(Optional.empty());

    var response =
        memberService.updateEmail(4L, new UpdateMemberEmailRequest(" Changed@Test.com "));

    assertThat(response.email()).isEqualTo("changed@test.com");
    assertThat(member.getEmail()).isEqualTo("changed@test.com");
  }

  @Test
  @DisplayName("현재 비밀번호가 맞지 않으면 비밀번호 변경 시 401-2 예외를 반환한다")
  void updatePasswordFailsWhenCurrentPasswordInvalid() {
    Member member = Member.create("member5@test.com", "$2a$10$hashValue", "member5");
    ReflectionTestUtils.setField(member, "id", 5L);
    given(memberRepository.findById(5L)).willReturn(Optional.of(member));
    given(passwordEncoder.matches("wrong-password", "$2a$10$hashValue")).willReturn(false);

    assertThatThrownBy(
            () ->
                memberService.updatePassword(
                    5L, new UpdateMemberPasswordRequest("wrong-password", "next-password")))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-2"));
  }

  @Test
  @DisplayName("회원 탈퇴 시 상태를 WITHDRAWN으로 바꾸고 refresh 토큰을 모두 폐기한다")
  void withdrawMemberMarksWithdrawnAndRevokesRefreshTokens() {
    Member member = Member.create("member6@test.com", "$2a$10$hashValue", "member6");
    ReflectionTestUtils.setField(member, "id", 6L);
    given(memberRepository.findById(6L)).willReturn(Optional.of(member));

    memberService.withdrawMember(6L);

    assertThat(member.getStatus()).isEqualTo(MemberStatus.WITHDRAWN);
    assertThat(member.isRandomReceiveAllowed()).isFalse();
    then(refreshTokenDomainService)
        .should()
        .revokeAllByMemberId(eq(6L), any(java.time.LocalDateTime.class));
  }
}
