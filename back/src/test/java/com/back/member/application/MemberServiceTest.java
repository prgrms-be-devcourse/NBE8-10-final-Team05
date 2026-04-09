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
import com.back.auth.domain.OAuthAccount;
import com.back.auth.domain.OAuthAccountRepository;
import com.back.global.exception.ServiceException;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.member.adapter.in.web.dto.AdminMemberDetailResponse;
import com.back.member.adapter.in.web.dto.AdminMemberListResponse;
import com.back.member.adapter.in.web.dto.AdminRevokeMemberSessionsRequest;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberRoleRequest;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberStatusRequest;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberEmailRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberPasswordRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.adapter.in.web.dto.WithdrawMemberRequest;
import com.back.member.domain.MemberAdminActionLogRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberRepository.AdminMemberListRow;
import com.back.member.domain.MemberStatus;
import com.back.post.repository.PostRepository;
import com.back.report.adapter.out.persistence.ReportRepository;
import java.time.LocalDateTime;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("회원 서비스 비밀번호 처리 테스트")
class MemberServiceTest {

  @Mock private MemberRepository memberRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private RefreshTokenDomainService refreshTokenDomainService;
  @Mock private OAuthAccountRepository oAuthAccountRepository;
  @Mock private MemberAdminActionLogRepository memberAdminActionLogRepository;
  @Mock private ReportRepository reportRepository;
  @Mock private PostRepository postRepository;
  @Mock private LetterRepository letterRepository;
  @Mock private Clock clock;

  @InjectMocks private MemberService memberService;

  @BeforeEach
  void setUpClock() {
    lenient().when(clock.getZone()).thenReturn(ZoneOffset.UTC);
    lenient().when(clock.instant()).thenReturn(Instant.parse("2026-03-27T00:00:00Z"));
    lenient()
        .when(oAuthAccountRepository.findAllByMemberIdOrderByIdAsc(any(Long.class)))
        .thenReturn(List.of());
    lenient()
        .when(memberAdminActionLogRepository.findByMemberIdOrderByCreateDateDesc(
            any(Long.class), any(Pageable.class)))
        .thenReturn(List.of());
    lenient()
        .when(reportRepository.findByReporterIdOrderByCreateDateDesc(
            any(Long.class), any(Pageable.class)))
        .thenReturn(List.of());
    lenient()
        .when(reportRepository.findPostTargetReportsByAuthorId(any(Long.class), any(Pageable.class)))
        .thenReturn(List.of());
    lenient()
        .when(reportRepository.findLetterTargetReportsBySenderId(any(Long.class), any(Pageable.class)))
        .thenReturn(List.of());
    lenient()
        .when(reportRepository.findCommentTargetReportsByAuthorId(any(Long.class), any(Pageable.class)))
        .thenReturn(List.of());
    lenient()
        .when(postRepository.findRecentByMemberId(any(Long.class), any(Pageable.class)))
        .thenReturn(List.of());
    lenient()
        .when(letterRepository.findRecentAdminLettersByMemberId(any(Long.class), any(Pageable.class)))
        .thenReturn(List.of());
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
    given(oAuthAccountRepository.existsByMemberId(4L)).willReturn(false);

    var response =
        memberService.updateEmail(4L, new UpdateMemberEmailRequest(" Changed@Test.com "));

    assertThat(response.email()).isEqualTo("changed@test.com");
    assertThat(member.getEmail()).isEqualTo("changed@test.com");
    assertThat(response.socialAccount()).isFalse();
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
    given(oAuthAccountRepository.existsByMemberId(6L)).willReturn(false);
    given(passwordEncoder.matches("current-password", "$2a$10$hashValue")).willReturn(true);

    memberService.withdrawMember(6L, new WithdrawMemberRequest("current-password"));

    assertThat(member.getStatus()).isEqualTo(MemberStatus.WITHDRAWN);
    assertThat(member.isRandomReceiveAllowed()).isFalse();
    then(refreshTokenDomainService)
        .should()
        .revokeAllByMemberId(eq(6L), any(java.time.LocalDateTime.class));
  }

  @Test
  @DisplayName("일반 계정 탈퇴 시 현재 비밀번호가 없으면 400-1 예외를 반환한다")
  void withdrawMemberFailsWhenCurrentPasswordMissingForLocalAccount() {
    Member member = Member.create("member7@test.com", "$2a$10$hashValue", "member7");
    ReflectionTestUtils.setField(member, "id", 7L);
    given(memberRepository.findById(7L)).willReturn(Optional.of(member));
    given(oAuthAccountRepository.existsByMemberId(7L)).willReturn(false);

    assertThatThrownBy(() -> memberService.withdrawMember(7L, new WithdrawMemberRequest("   ")))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("400-1"));
  }

  @Test
  @DisplayName("소셜 계정 탈퇴는 현재 비밀번호 없이도 진행된다")
  void withdrawMemberAllowsSocialAccountWithoutCurrentPassword() {
    Member member = Member.create("member8@test.com", "$2a$10$hashValue", "member8");
    ReflectionTestUtils.setField(member, "id", 8L);
    given(memberRepository.findById(8L)).willReturn(Optional.of(member));
    given(oAuthAccountRepository.existsByMemberId(8L)).willReturn(true);

    memberService.withdrawMember(8L, new WithdrawMemberRequest(null));

    assertThat(member.getStatus()).isEqualTo(MemberStatus.WITHDRAWN);
    then(passwordEncoder).should(never()).matches(any(), any());
  }

  @Test
  @DisplayName("관리자 회원 목록 조회는 상태/권한/소셜 메타데이터를 함께 매핑한다")
  void getAdminMembersMapsOperationalMetadata() {
    AdminMemberListRow projection =
        new StubAdminMemberListRow(
            9L,
            "member9@test.com",
            "member9",
            "ADMIN",
            "ACTIVE",
            true,
            true,
            LocalDateTime.of(2026, 4, 1, 9, 0),
            LocalDateTime.of(2026, 4, 9, 8, 30));

    given(
            memberRepository.searchAdminMembers(
                eq(null),
                eq("ACTIVE"),
                eq("ADMIN"),
                eq("SOCIAL"),
                eq(null),
                any(Pageable.class)))
        .willReturn(new PageImpl<>(List.of(projection)));

    AdminMemberListResponse response =
        memberService.getAdminMembers(null, "ACTIVE", "ADMIN", "SOCIAL", 0, 20);

    assertThat(response.members()).hasSize(1);
    assertThat(response.members().get(0).id()).isEqualTo(9L);
    assertThat(response.members().get(0).role()).isEqualTo("ADMIN");
    assertThat(response.members().get(0).status()).isEqualTo("ACTIVE");
    assertThat(response.members().get(0).socialAccount()).isTrue();
    assertThat(response.members().get(0).lastLoginAt())
        .isEqualTo(LocalDateTime.of(2026, 4, 9, 8, 30));
  }

  @Test
  @DisplayName("관리자 회원 상세 조회는 연결 provider와 마지막 로그인 시각을 반환한다")
  void getAdminMemberDetailIncludesProvidersAndLastLoginAt() {
    Member member = Member.create("member10@test.com", "$2a$10$hashValue", "member10");
    ReflectionTestUtils.setField(member, "id", 10L);
    ReflectionTestUtils.setField(member, "role", MemberRole.USER);
    ReflectionTestUtils.setField(member, "status", MemberStatus.BLOCKED);
    member.setCreateDate(LocalDateTime.of(2026, 4, 2, 10, 0));
    ReflectionTestUtils.setField(member, "modifyDate", LocalDateTime.of(2026, 4, 9, 15, 0));

    OAuthAccount googleAccount =
        OAuthAccount.connect(member, "google", "google-10", "member10@test.com");
    googleAccount.touchLastLoginAt(LocalDateTime.of(2026, 4, 8, 17, 45));
    OAuthAccount kakaoAccount =
        OAuthAccount.connect(member, "kakao", "kakao-10", "member10@test.com");
    kakaoAccount.touchLastLoginAt(LocalDateTime.of(2026, 4, 9, 7, 20));

    given(memberRepository.findById(10L)).willReturn(Optional.of(member));
    given(oAuthAccountRepository.findAllByMemberIdOrderByIdAsc(10L))
        .willReturn(List.of(googleAccount, kakaoAccount));

    AdminMemberDetailResponse response = memberService.getAdminMemberDetail(10L);

    assertThat(response.role()).isEqualTo("USER");
    assertThat(response.status()).isEqualTo("BLOCKED");
    assertThat(response.socialAccount()).isTrue();
    assertThat(response.connectedProviders()).containsExactly("google", "kakao");
    assertThat(response.lastLoginAt()).isEqualTo(LocalDateTime.of(2026, 4, 9, 7, 20));
    assertThat(response.modifiedAt()).isEqualTo(LocalDateTime.of(2026, 4, 9, 15, 0));
    assertThat(response.actionLogs()).isEmpty();
    assertThat(response.recentPosts()).isEmpty();
    assertThat(response.recentLetters()).isEmpty();
  }

  @Test
  @DisplayName("관리자 회원 목록 조회는 잘못된 raw role/status 문자열도 기본값으로 매핑한다")
  void getAdminMembersFallsBackForLegacyInvalidRoleAndStatus() {
    AdminMemberListRow projection =
        new StubAdminMemberListRow(
            41L,
            "legacy@test.com",
            "legacy",
            "LEGACY_ADMIN",
            "SUSPENDED",
            true,
            false,
            LocalDateTime.of(2026, 4, 1, 9, 0),
            null);

    given(
            memberRepository.searchAdminMembers(
                eq(null), eq(null), eq(null), eq(null), eq(null), any(Pageable.class)))
        .willReturn(new PageImpl<>(List.of(projection)));

    AdminMemberListResponse response = memberService.getAdminMembers(null, null, null, null, 0, 20);

    assertThat(response.members()).hasSize(1);
    assertThat(response.members().get(0).role()).isEqualTo("USER");
    assertThat(response.members().get(0).status()).isEqualTo("ACTIVE");
  }

  @Test
  @DisplayName("관리자 회원 차단은 상태 변경, 랜덤 수신 비활성화, refresh 세션 만료, 감사 로그 저장을 수행한다")
  void updateAdminMemberStatusBlocksMemberAndRevokesSessions() {
    Member member = Member.create("blocked-member@test.com", "$2a$10$hashValue", "blocked");
    ReflectionTestUtils.setField(member, "id", 11L);
    Member admin = Member.create("admin@test.com", "$2a$10$hashValue", "운영자");
    ReflectionTestUtils.setField(admin, "id", 99L);

    given(memberRepository.findById(11L)).willReturn(Optional.of(member));
    given(memberRepository.findById(99L)).willReturn(Optional.of(admin));

    AdminMemberDetailResponse response =
        memberService.updateAdminMemberStatus(
            11L,
            99L,
            new AdminUpdateMemberStatusRequest("BLOCKED", "운영 정책 위반", true));

    assertThat(member.getStatus()).isEqualTo(MemberStatus.BLOCKED);
    assertThat(member.isRandomReceiveAllowed()).isFalse();
    assertThat(response.status()).isEqualTo("BLOCKED");
    then(refreshTokenDomainService)
        .should()
        .revokeAllByMemberId(eq(11L), any(LocalDateTime.class));
    then(memberAdminActionLogRepository).should().save(any());
  }

  @Test
  @DisplayName("마지막 활성 관리자 권한 강등은 차단된다")
  void updateAdminMemberRoleProtectsLastActiveAdmin() {
    Member admin = Member.create("solo-admin@test.com", "$2a$10$hashValue", "solo");
    ReflectionTestUtils.setField(admin, "id", 21L);
    ReflectionTestUtils.setField(admin, "role", MemberRole.ADMIN);
    ReflectionTestUtils.setField(admin, "status", MemberStatus.ACTIVE);

    given(memberRepository.findById(21L)).willReturn(Optional.of(admin));
    given(memberRepository.countByRoleAndStatus(MemberRole.ADMIN, MemberStatus.ACTIVE))
        .willReturn(1L);

    assertThatThrownBy(
            () ->
                memberService.updateAdminMemberRole(
                    21L, 77L, new AdminUpdateMemberRoleRequest("USER", "권한 정리")))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode())
                    .isEqualTo("409-1"));
  }

  @Test
  @DisplayName("관리자 세션 만료는 refresh 토큰 일괄 폐기와 감사 로그 저장을 수행한다")
  void revokeAdminMemberSessionsWritesAuditLog() {
    Member member = Member.create("session-member@test.com", "$2a$10$hashValue", "session");
    ReflectionTestUtils.setField(member, "id", 31L);
    Member admin = Member.create("admin2@test.com", "$2a$10$hashValue", "운영자2");
    ReflectionTestUtils.setField(admin, "id", 88L);

    given(memberRepository.findById(31L)).willReturn(Optional.of(member));
    given(memberRepository.findById(88L)).willReturn(Optional.of(admin));

    AdminMemberDetailResponse response =
        memberService.revokeAdminMemberSessions(
            31L, 88L, new AdminRevokeMemberSessionsRequest("비정상 로그인 정리"));

    assertThat(response.id()).isEqualTo(31L);
    then(refreshTokenDomainService)
        .should()
        .revokeAllByMemberId(eq(31L), any(LocalDateTime.class));
    then(memberAdminActionLogRepository).should().save(any());
  }

  private static final class StubAdminMemberListRow implements AdminMemberListRow {
    private final Long id;
    private final String email;
    private final String nickname;
    private final String rawRole;
    private final String rawStatus;
    private final Boolean randomReceiveAllowed;
    private final Boolean socialAccount;
    private final LocalDateTime createdAt;
    private final LocalDateTime lastLoginAt;

    private StubAdminMemberListRow(
        Long id,
        String email,
        String nickname,
        String rawRole,
        String rawStatus,
        Boolean randomReceiveAllowed,
        Boolean socialAccount,
        LocalDateTime createdAt,
        LocalDateTime lastLoginAt) {
      this.id = id;
      this.email = email;
      this.nickname = nickname;
      this.rawRole = rawRole;
      this.rawStatus = rawStatus;
      this.randomReceiveAllowed = randomReceiveAllowed;
      this.socialAccount = socialAccount;
      this.createdAt = createdAt;
      this.lastLoginAt = lastLoginAt;
    }

    @Override
    public Long getId() {
      return id;
    }

    @Override
    public String getEmail() {
      return email;
    }

    @Override
    public String getNickname() {
      return nickname;
    }

    @Override
    public String getRawRole() {
      return rawRole;
    }

    @Override
    public String getRawStatus() {
      return rawStatus;
    }

    @Override
    public Boolean getRandomReceiveAllowed() {
      return randomReceiveAllowed;
    }

    @Override
    public Boolean getSocialAccount() {
      return socialAccount;
    }

    @Override
    public LocalDateTime getCreatedAt() {
      return createdAt;
    }

    @Override
    public LocalDateTime getLastLoginAt() {
      return lastLoginAt;
    }
  }
}
