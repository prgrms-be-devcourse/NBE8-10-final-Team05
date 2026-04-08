package com.back.global.security.config;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.back.auth.application.AuthService;
import com.back.diary.adapter.out.persistence.repository.DiaryRepository;
import com.back.diary.domain.Diary;
import com.back.global.security.jwt.JwtTokenService;
import com.back.global.security.jwt.JwtProperties;
import com.back.global.time.KstDateRanges;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.letter.domain.Letter;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import com.google.genai.Client;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.LocalDateTime;
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
  @Autowired private JwtProperties jwtProperties;
  @Autowired private AuthService authService;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private PostRepository postRepository;
  @Autowired private LetterRepository letterRepository;
  @Autowired private DiaryRepository diaryRepository;
  @Autowired private Clock clock;
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
  @DisplayName("공개 로그인 API는 토큰 없이도 정상 동작한다")
  void loginEndpointRemainsPublic() throws Exception {
    Member member = createMember(MemberRole.USER, MemberStatus.ACTIVE);
    String requestBody =
        objectMapper.writeValueAsString(
            new AuthLoginIntegrationRequest(member.getEmail(), "plain-pass-1234"));

    mockMvc
        .perform(post("/api/v1/auth/login").contentType(APPLICATION_JSON).content(requestBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-3"))
        .andExpect(jsonPath("$.data.member.email").value(member.getEmail()));
  }

  @Test
  @DisplayName("공개 refresh API는 인증 헤더 없이 호출돼도 컨트롤러 규약 코드로 응답한다")
  void refreshEndpointRemainsPublic() throws Exception {
    mockMvc
        .perform(post("/api/v1/auth/refresh"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-3"))
        .andExpect(jsonPath("$.msg").value("Refresh token cookie is required."));
  }

  @Test
  @DisplayName("공개 logout API는 인증 헤더 없이 호출돼도 정상 응답한다")
  void logoutEndpointRemainsPublic() throws Exception {
    mockMvc
        .perform(post("/api/v1/auth/logout"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-5"))
        .andExpect(jsonPath("$.msg").value("Logged out successfully."));
  }

  @Test
  @DisplayName("공개 게시글 목록 API는 토큰 없이도 정상 동작한다")
  void postsListEndpointRemainsPublic() throws Exception {
    mockMvc
        .perform(get("/api/v1/posts").param("page", "0").param("size", "8"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-1"));
  }

  @Test
  @DisplayName("공개 게시글 상세 API는 토큰 없이도 정상 동작한다")
  void postDetailEndpointRemainsPublic() throws Exception {
    Member member = createMember(MemberRole.USER, MemberStatus.ACTIVE);
    Post post =
        postRepository.saveAndFlush(
            Post.builder()
                .title("public-post")
                .content("public-content")
                .summary("public-content")
                .member(member)
                .category(PostCategory.WORRY)
                .status(PostStatus.PUBLISHED)
                .build());

    mockMvc
        .perform(get("/api/v1/posts/{id}", post.getId()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-2"))
        .andExpect(jsonPath("$.data.id").value(post.getId()));
  }

  @Test
  @DisplayName("공개 홈 통계 API는 토큰 없이도 오늘 집계를 반환한다")
  void homeStatsEndpointRemainsPublic() throws Exception {
    LocalDateTime todayMorning = KstDateRanges.today(clock).startInclusive().plusHours(9);
    LocalDateTime yesterdayMorning = KstDateRanges.today(clock).startInclusive().minusDays(1).plusHours(9);

    Member sender = createMember(MemberRole.USER, MemberStatus.ACTIVE);
    Member receiver = createMember(MemberRole.USER, MemberStatus.ACTIVE);

    Post todayWorryPost =
        postRepository.saveAndFlush(
            Post.builder()
                .title("today-worry")
                .content("content")
                .summary("content")
                .member(sender)
                .category(PostCategory.WORRY)
                .status(PostStatus.PUBLISHED)
                .build());
    todayWorryPost.setCreateDate(todayMorning);
    postRepository.saveAndFlush(todayWorryPost);

    Post todayDailyPost =
        postRepository.saveAndFlush(
            Post.builder()
                .title("today-daily")
                .content("content")
                .summary("content")
                .member(sender)
                .category(PostCategory.DAILY)
                .status(PostStatus.PUBLISHED)
                .build());
    todayDailyPost.setCreateDate(todayMorning);
    postRepository.saveAndFlush(todayDailyPost);

    Post yesterdayWorryPost =
        postRepository.saveAndFlush(
            Post.builder()
                .title("yesterday-worry")
                .content("content")
                .summary("content")
                .member(sender)
                .category(PostCategory.WORRY)
                .status(PostStatus.PUBLISHED)
                .build());
    yesterdayWorryPost.setCreateDate(yesterdayMorning);
    postRepository.saveAndFlush(yesterdayWorryPost);

    Letter todayLetter =
        letterRepository.saveAndFlush(
            Letter.builder()
                .title("today-letter")
                .content("letter")
                .summary("letter")
                .sender(sender)
                .build());
    todayLetter.dispatch(receiver);
    todayLetter.setCreateDate(todayMorning);
    letterRepository.saveAndFlush(todayLetter);

    Diary todayDiary = Diary.create(sender.getId(), sender.getNickname(), "today-diary", "content", "기록", null, true);
    todayDiary.setCreateDate(todayMorning);
    diaryRepository.saveAndFlush(todayDiary);

    mockMvc
        .perform(get("/api/v1/home/stats"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultCode").value("200-1"))
        .andExpect(jsonPath("$.data.todayWorryCount").value(1))
        .andExpect(jsonPath("$.data.todayLetterCount").value(1))
        .andExpect(jsonPath("$.data.todayDiaryCount").value(1));
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
  @DisplayName("차단된 회원의 refresh 쿠키는 실제 컨텍스트에서도 403-2를 반환한다")
  void blockedMemberRefreshCookieReturns403() throws Exception {
    Member member = createMember(MemberRole.USER, MemberStatus.ACTIVE);
    String rawRefreshToken = authService.issueTokenPairForMember(member).refreshToken();

    ReflectionTestUtils.setField(member, "status", MemberStatus.BLOCKED);
    memberRepository.saveAndFlush(member);

    mockMvc
        .perform(
            post("/api/v1/auth/refresh")
                .cookie(new Cookie(jwtProperties.refreshTokenCookieName(), rawRefreshToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-2"))
        .andExpect(jsonPath("$.msg").value("Member is blocked."));
  }

  @Test
  @DisplayName("탈퇴한 회원의 refresh 쿠키는 실제 컨텍스트에서도 403-3을 반환한다")
  void withdrawnMemberRefreshCookieReturns403() throws Exception {
    Member member = createMember(MemberRole.USER, MemberStatus.ACTIVE);
    String rawRefreshToken = authService.issueTokenPairForMember(member).refreshToken();

    ReflectionTestUtils.setField(member, "status", MemberStatus.WITHDRAWN);
    memberRepository.saveAndFlush(member);

    mockMvc
        .perform(
            post("/api/v1/auth/refresh")
                .cookie(new Cookie(jwtProperties.refreshTokenCookieName(), rawRefreshToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.resultCode").value("403-3"))
        .andExpect(jsonPath("$.msg").value("Member is withdrawn."));
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
  @DisplayName("허용 목록에 없는 auth POST 경로는 실제 컨텍스트에서 401을 반환한다")
  void nonWhitelistedAuthPostRouteReturns401() throws Exception {
    mockMvc
        .perform(post("/api/v1/auth/internal-sync"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.resultCode").value("401-1"))
        .andExpect(jsonPath("$.msg").value("Authentication is required."));
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

  private record AuthLoginIntegrationRequest(String email, String password) {}

  private record AuthSignupIntegrationRequest(String email, String password, String nickname) {}
}
