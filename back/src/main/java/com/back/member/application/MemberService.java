package com.back.member.application;

import com.back.auth.domain.OAuthAccount;
import com.back.auth.domain.OAuthAccountRepository;
import com.back.auth.domain.RefreshTokenDomainService;
import com.back.global.exception.ServiceException;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.letter.domain.Letter;
import com.back.member.adapter.in.web.dto.AdminMemberActionLogItem;
import com.back.member.adapter.in.web.dto.AdminMemberDetailResponse;
import com.back.member.adapter.in.web.dto.AdminMemberLetterHistoryItem;
import com.back.member.adapter.in.web.dto.AdminMemberListItem;
import com.back.member.adapter.in.web.dto.AdminMemberListResponse;
import com.back.member.adapter.in.web.dto.AdminMemberPostHistoryItem;
import com.back.member.adapter.in.web.dto.AdminMemberReportHistoryItem;
import com.back.member.adapter.in.web.dto.AdminRevokeMemberSessionsRequest;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberRoleRequest;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberStatusRequest;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberEmailRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberPasswordRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.adapter.in.web.dto.WithdrawMemberRequest;
import com.back.member.domain.MemberAdminActionLogRepository;
import com.back.member.domain.MemberAdminActionType;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import com.back.post.repository.PostRepository;
import com.back.report.adapter.out.persistence.ReportRepository;
import com.back.report.domain.Report;
import java.util.ArrayList;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회원 도메인의 애플리케이션 서비스.
 *
 * <p>회원 생성, 단건 조회, 프로필(닉네임) 수정 유스케이스를 담당한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

  private static final String ERROR_CODE_BAD_REQUEST = "400-1";
  private static final String ERROR_CODE_NOT_FOUND = "404-1";
  private static final String ERROR_CODE_CONFLICT = "409-1";
  private static final String ERROR_MSG_EMAIL_EXISTS = "Member email already exists.";
  private static final String ERROR_MSG_MEMBER_NOT_FOUND = "Member not found.";
  private static final String ERROR_MSG_EMAIL_BLANK = "email must not be blank.";
  private static final String ERROR_MSG_PASSWORD_BLANK = "password must not be blank.";
  private static final String ERROR_MSG_CURRENT_PASSWORD_BLANK =
      "currentPassword must not be blank.";
  private static final String ERROR_MSG_INVALID_CURRENT_PASSWORD = "Current password is invalid.";
  private static final String ERROR_MSG_INVALID_MEMBER_STATUS = "invalid member status filter.";
  private static final String ERROR_MSG_INVALID_MEMBER_ROLE = "invalid member role filter.";
  private static final String ERROR_MSG_INVALID_PROVIDER_FILTER = "invalid member provider filter.";
  private static final String ERROR_MSG_INVALID_ADMIN_ACTION_STATUS =
      "admin status action only supports ACTIVE or BLOCKED.";
  private static final String ERROR_MSG_ADMIN_REASON_REQUIRED = "admin action reason is required.";
  private static final String ERROR_MSG_CANNOT_BLOCK_SELF = "admin cannot block self.";
  private static final String ERROR_MSG_CANNOT_CHANGE_OWN_ROLE =
      "admin cannot change own role.";
  private static final String ERROR_MSG_LAST_ACTIVE_ADMIN_REQUIRED =
      "at least one active admin must remain.";
  private static final String ERROR_MSG_WITHDRAWN_MEMBER_MODERATION_UNSUPPORTED =
      "withdrawn member cannot be moderated here.";

  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;
  private final RefreshTokenDomainService refreshTokenDomainService;
  private final OAuthAccountRepository oAuthAccountRepository;
  private final MemberAdminActionLogRepository memberAdminActionLogRepository;
  private final ReportRepository reportRepository;
  private final PostRepository postRepository;
  private final LetterRepository letterRepository;
  private final Clock clock;

  /** 신규 회원을 생성하고 응답 DTO로 반환한다. */
  @Transactional
  public MemberResponse createMember(CreateMemberRequest request) {
    String email = normalizeEmail(request.email());
    validateEmailNotDuplicated(email);
    String passwordHash = encodePassword(request.password());
    Member member = Member.create(email, passwordHash, request.nickname());
    Member savedMember = memberRepository.save(member);
    return toMemberResponse(savedMember);
  }

  /** memberId로 회원 단건 조회를 수행한다. */
  public MemberResponse getMember(Long memberId) {
    return toMemberResponse(findMemberById(memberId));
  }

  /** 관리자 회원 목록 조회: 검색/필터/페이징을 지원한다. */
  public AdminMemberListResponse getAdminMembers(
      String query, String status, String role, String provider, int page, int size) {
    String normalizedQuery = normalizeQuery(query);
    MemberStatus statusFilter = resolveAdminStatusFilter(status);
    MemberRole roleFilter = resolveAdminRoleFilter(role);
    String providerFilter = resolveAdminProviderFilter(provider);
    Long memberIdQuery = parseMemberIdQuery(normalizedQuery);
    Pageable pageable =
        PageRequest.of(
            Math.max(page, 0),
            Math.min(Math.max(size, 1), 50),
            Sort.by(Sort.Direction.DESC, "createDate"));

    Page<Member> memberPage =
        memberRepository.searchAdminMembers(
            normalizedQuery, statusFilter, roleFilter, providerFilter, memberIdQuery, pageable);

    Map<Long, OAuthAccountSnapshot> oauthSnapshots =
        buildOAuthSnapshots(
            memberPage.getContent().stream().map(Member::getId).toList());

    Page<AdminMemberListItem> mappedPage =
        memberPage.map(
            member -> {
              OAuthAccountSnapshot snapshot =
                  oauthSnapshots.getOrDefault(member.getId(), OAuthAccountSnapshot.empty());
              return AdminMemberListItem.from(
                  member, snapshot.socialAccount(), snapshot.lastLoginAt());
            });

    return AdminMemberListResponse.from(mappedPage);
  }

  /** 관리자 회원 상세 조회: 운영 판단용 메타데이터를 함께 반환한다. */
  public AdminMemberDetailResponse getAdminMemberDetail(Long memberId) {
    Member member = findMemberById(memberId);
    return toAdminMemberDetailResponse(member);
  }

  /** 관리자 회원 상태를 ACTIVE/BLOCKED 범위에서 변경한다. */
  @Transactional
  public AdminMemberDetailResponse updateAdminMemberStatus(
      Long memberId, Long adminMemberId, AdminUpdateMemberStatusRequest request) {
    MemberStatus nextStatus = resolveAdminActionStatus(request == null ? null : request.status());
    String reason = normalizeRequiredAdminReason(request == null ? null : request.reason());
    boolean revokeSessions =
        request != null
            && request.revokeSessions() != null
            && Boolean.TRUE.equals(request.revokeSessions());

    if (nextStatus == MemberStatus.BLOCKED) {
      blockMemberByAdminAction(memberId, adminMemberId, reason, request == null || request.revokeSessions() == null || revokeSessions);
    } else {
      Member member = findMemberById(memberId);
      unblockMember(member, adminMemberId, reason, revokeSessions);
    }

    return getAdminMemberDetail(memberId);
  }

  /** 관리자 회원 권한을 변경하고 refresh 세션을 강제 만료한다. */
  @Transactional
  public AdminMemberDetailResponse updateAdminMemberRole(
      Long memberId, Long adminMemberId, AdminUpdateMemberRoleRequest request) {
    Member member = findMemberById(memberId);
    MemberRole nextRole = resolveAdminActionRole(request == null ? null : request.role());
    String reason = normalizeRequiredAdminReason(request == null ? null : request.reason());

    if (member.getRole() == nextRole) {
      return getAdminMemberDetail(memberId);
    }

    validateAdminCapabilityReduction(member, adminMemberId, null, nextRole);

    String beforeValue = "role:" + member.getRole().name();
    member.updateRole(nextRole);
    refreshTokenDomainService.revokeAllByMemberId(memberId, LocalDateTime.now(clock));
    saveAdminActionLog(
        member,
        adminMemberId,
        MemberAdminActionType.CHANGE_ROLE,
        beforeValue,
        "role:" + nextRole.name(),
        reason);

    return getAdminMemberDetail(memberId);
  }

  /** 관리자 회원 refresh 세션을 강제로 만료한다. */
  @Transactional
  public AdminMemberDetailResponse revokeAdminMemberSessions(
      Long memberId, Long adminMemberId, AdminRevokeMemberSessionsRequest request) {
    Member member = findMemberById(memberId);
    refreshTokenDomainService.revokeAllByMemberId(memberId, LocalDateTime.now(clock));
    saveAdminActionLog(
        member,
        adminMemberId,
        MemberAdminActionType.REVOKE_SESSIONS,
        null,
        null,
        normalizeOptionalAdminMemo(request == null ? null : request.reason()));
    return getAdminMemberDetail(memberId);
  }

  /** 신고/편지 관리자 도구에서도 동일한 회원 차단 규칙과 감사 로그를 사용한다. */
  @Transactional
  public void blockMemberByAdminAction(
      Long memberId, Long adminMemberId, String reason, boolean revokeSessions) {
    Member member = findMemberById(memberId);
    String normalizedReason = normalizeOptionalAdminMemo(reason);
    blockMember(
        member,
        adminMemberId,
        normalizedReason == null ? "관리자 제재" : normalizedReason,
        revokeSessions);
  }

  /** 회원 프로필(현재는 닉네임)을 수정한다. */
  @Transactional
  public MemberResponse updateProfile(Long memberId, UpdateMemberProfileRequest request) {
    Member member = findMemberById(memberId);
    member.updateNickname(request.nickname());
    return toMemberResponse(member);
  }

  /** 회원 이메일을 변경한다. */
  @Transactional
  public MemberResponse updateEmail(Long memberId, UpdateMemberEmailRequest request) {
    Member member = findMemberById(memberId);
    String nextEmail = normalizeEmail(request.email());
    validateEmailNotDuplicated(memberId, nextEmail);
    member.updateEmail(nextEmail);
    return toMemberResponse(member);
  }

  /** 현재 비밀번호 확인 후 새 비밀번호로 교체한다. */
  @Transactional
  public MemberResponse updatePassword(Long memberId, UpdateMemberPasswordRequest request) {
    Member member = findMemberById(memberId);
    validateCurrentPassword(member, request.currentPassword());
    member.updatePasswordHash(encodePassword(request.newPassword()));
    return toMemberResponse(member);
  }

  /** 회원을 탈퇴 처리하고 해당 회원의 refresh 토큰을 모두 폐기한다. */
  @Transactional
  public void withdrawMember(Long memberId, WithdrawMemberRequest request) {
    Member member = findMemberById(memberId);
    if (!isSocialAccount(memberId)) {
      validateCurrentPassword(member, request == null ? null : request.currentPassword());
    }
    member.updateStatus(MemberStatus.WITHDRAWN);
    member.updateRandomReceiveAllowed(false);
    refreshTokenDomainService.revokeAllByMemberId(memberId, LocalDateTime.now(clock));
  }

  private Member findMemberById(Long memberId) {
    return memberRepository
        .findById(memberId)
        .orElseThrow(() -> new ServiceException(ERROR_CODE_NOT_FOUND, ERROR_MSG_MEMBER_NOT_FOUND));
  }

  private String normalizeEmail(String email) {
    if (email == null || email.isBlank()) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_EMAIL_BLANK);
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeQuery(String query) {
    if (query == null) {
      return null;
    }

    String normalized = query.trim();
    return normalized.isEmpty() ? null : normalized;
  }

  private MemberStatus resolveAdminStatusFilter(String status) {
    String normalized = normalizeQuery(status);
    if (normalized == null || "ALL".equalsIgnoreCase(normalized)) {
      return null;
    }

    try {
      return MemberStatus.valueOf(normalized.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_INVALID_MEMBER_STATUS);
    }
  }

  private MemberRole resolveAdminRoleFilter(String role) {
    String normalized = normalizeQuery(role);
    if (normalized == null || "ALL".equalsIgnoreCase(normalized)) {
      return null;
    }

    try {
      return MemberRole.valueOf(normalized.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_INVALID_MEMBER_ROLE);
    }
  }

  private String resolveAdminProviderFilter(String provider) {
    String normalized = normalizeQuery(provider);
    if (normalized == null || "ALL".equalsIgnoreCase(normalized)) {
      return null;
    }

    String upper = normalized.toUpperCase(Locale.ROOT);
    if (!"LOCAL".equals(upper) && !"SOCIAL".equals(upper)) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_INVALID_PROVIDER_FILTER);
    }

    return upper;
  }

  private Long parseMemberIdQuery(String query) {
    if (query == null) {
      return null;
    }

    try {
      long parsed = Long.parseLong(query);
      return parsed > 0 ? parsed : null;
    } catch (NumberFormatException exception) {
      return null;
    }
  }

  private void validateEmailNotDuplicated(String email) {
    if (memberRepository.existsByEmail(email)) {
      throw new ServiceException(ERROR_CODE_CONFLICT, ERROR_MSG_EMAIL_EXISTS);
    }
  }

  private void validateEmailNotDuplicated(Long memberId, String email) {
    memberRepository
        .findByEmail(email)
        .filter(existing -> !existing.getId().equals(memberId))
        .ifPresent(existing -> {
          throw new ServiceException(ERROR_CODE_CONFLICT, ERROR_MSG_EMAIL_EXISTS);
        });
  }

  private String encodePassword(String rawPassword) {
    validateRawPassword(rawPassword);
    return passwordEncoder.encode(rawPassword);
  }

  private void validateRawPassword(String password) {
    if (password == null || password.isBlank()) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_PASSWORD_BLANK);
    }
  }

  private void validateCurrentPassword(Member member, String currentPassword) {
    if (currentPassword == null || currentPassword.isBlank()) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_CURRENT_PASSWORD_BLANK);
    }

    if (!member.matchesPassword(currentPassword, passwordEncoder)) {
      throw new ServiceException("401-2", ERROR_MSG_INVALID_CURRENT_PASSWORD);
    }
  }

  @Transactional
  public MemberResponse toggleRandomReceive(Long memberId) {
    Member member = findMemberById(memberId);
    member.updateRandomReceiveAllowed(!member.isRandomReceiveAllowed());
    return toMemberResponse(member);
  }

  private MemberResponse toMemberResponse(Member member) {
    return MemberResponse.from(member, isSocialAccount(member.getId()));
  }

  private boolean isSocialAccount(Long memberId) {
    return oAuthAccountRepository.existsByMemberId(memberId);
  }

  private AdminMemberDetailResponse toAdminMemberDetailResponse(Member member) {
    Long memberId = member.getId();
    List<OAuthAccount> oauthAccounts = oAuthAccountRepository.findAllByMemberIdOrderByIdAsc(memberId);
    Pageable actionLogPageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createDate"));
    Pageable historyPageable = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createDate"));

    List<AdminMemberActionLogItem> actionLogs =
        memberAdminActionLogRepository.findByMemberIdOrderByCreateDateDesc(memberId, actionLogPageable)
            .stream()
            .map(AdminMemberActionLogItem::from)
            .toList();
    List<AdminMemberReportHistoryItem> submittedReports =
        reportRepository.findByReporterIdOrderByCreateDateDesc(memberId, historyPageable).stream()
            .map(AdminMemberReportHistoryItem::submitted)
            .toList();
    List<AdminMemberReportHistoryItem> receivedReports = buildReceivedReportHistory(memberId, historyPageable);
    List<AdminMemberPostHistoryItem> recentPosts =
        postRepository.findRecentByMemberId(memberId, historyPageable).stream()
            .map(AdminMemberPostHistoryItem::from)
            .toList();
    List<AdminMemberLetterHistoryItem> recentLetters =
        letterRepository.findRecentAdminLettersByMemberId(memberId, historyPageable).stream()
            .map(letter -> AdminMemberLetterHistoryItem.from(letter, memberId))
            .toList();

    return AdminMemberDetailResponse.from(
        member,
        oauthAccounts,
        actionLogs,
        submittedReports,
        receivedReports,
        recentPosts,
        recentLetters);
  }

  private Map<Long, OAuthAccountSnapshot> buildOAuthSnapshots(List<Long> memberIds) {
    if (memberIds.isEmpty()) {
      return Map.of();
    }

    List<OAuthAccount> oauthAccounts =
        oAuthAccountRepository.findAllByMemberIdInOrderByMemberIdAscIdAsc(memberIds);
    Map<Long, OAuthAccountSnapshotAccumulator> accumulators = new HashMap<>();

    for (OAuthAccount oauthAccount : oauthAccounts) {
      accumulators
          .computeIfAbsent(oauthAccount.getMember().getId(), ignored -> new OAuthAccountSnapshotAccumulator())
          .accumulate(oauthAccount);
    }

    Map<Long, OAuthAccountSnapshot> snapshots = new HashMap<>();
    accumulators.forEach((memberId, accumulator) -> snapshots.put(memberId, accumulator.snapshot()));
    return snapshots;
  }

  private List<AdminMemberReportHistoryItem> buildReceivedReportHistory(
      Long memberId, Pageable pageable) {
    List<Report> receivedReports = new ArrayList<>();
    receivedReports.addAll(reportRepository.findPostTargetReportsByAuthorId(memberId, pageable));
    receivedReports.addAll(reportRepository.findLetterTargetReportsBySenderId(memberId, pageable));
    receivedReports.addAll(reportRepository.findCommentTargetReportsByAuthorId(memberId, pageable));
    receivedReports.sort(Comparator.comparing(Report::getCreateDate).reversed());

    return receivedReports.stream()
        .limit(pageable.getPageSize())
        .map(AdminMemberReportHistoryItem::received)
        .toList();
  }

  private MemberStatus resolveAdminActionStatus(String status) {
    MemberStatus resolved = resolveAdminStatusFilter(status);
    if (resolved == null || (resolved != MemberStatus.ACTIVE && resolved != MemberStatus.BLOCKED)) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_INVALID_ADMIN_ACTION_STATUS);
    }
    return resolved;
  }

  private MemberRole resolveAdminActionRole(String role) {
    MemberRole resolved = resolveAdminRoleFilter(role);
    if (resolved == null) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_INVALID_MEMBER_ROLE);
    }
    return resolved;
  }

  private String normalizeRequiredAdminReason(String reason) {
    String normalized = normalizeOptionalAdminMemo(reason);
    if (normalized == null) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_ADMIN_REASON_REQUIRED);
    }
    return normalized;
  }

  private String normalizeOptionalAdminMemo(String memo) {
    return normalizeQuery(memo);
  }

  private void blockMember(
      Member member, Long adminMemberId, String reason, boolean revokeSessions) {
    if (adminMemberId != null && adminMemberId.equals(member.getId())) {
      throw new ServiceException(ERROR_CODE_CONFLICT, ERROR_MSG_CANNOT_BLOCK_SELF);
    }
    if (safeStatus(member) == MemberStatus.WITHDRAWN) {
      throw new ServiceException(
          ERROR_CODE_CONFLICT, ERROR_MSG_WITHDRAWN_MEMBER_MODERATION_UNSUPPORTED);
    }

    validateAdminCapabilityReduction(member, adminMemberId, MemberStatus.BLOCKED, null);

    String beforeValue = "status:" + safeStatus(member).name();
    member.updateStatus(MemberStatus.BLOCKED);
    member.updateRandomReceiveAllowed(false);
    if (revokeSessions) {
      refreshTokenDomainService.revokeAllByMemberId(member.getId(), LocalDateTime.now(clock));
    }

    saveAdminActionLog(
        member,
        adminMemberId,
        MemberAdminActionType.BLOCK,
        beforeValue,
        "status:BLOCKED",
        reason);
  }

  private void unblockMember(
      Member member, Long adminMemberId, String reason, boolean revokeSessions) {
    if (safeStatus(member) == MemberStatus.WITHDRAWN) {
      throw new ServiceException(
          ERROR_CODE_CONFLICT, ERROR_MSG_WITHDRAWN_MEMBER_MODERATION_UNSUPPORTED);
    }

    String beforeValue = "status:" + safeStatus(member).name();
    member.updateStatus(MemberStatus.ACTIVE);
    if (revokeSessions) {
      refreshTokenDomainService.revokeAllByMemberId(member.getId(), LocalDateTime.now(clock));
    }

    saveAdminActionLog(
        member,
        adminMemberId,
        MemberAdminActionType.UNBLOCK,
        beforeValue,
        "status:ACTIVE",
        reason);
  }

  private void validateAdminCapabilityReduction(
      Member member, Long adminMemberId, MemberStatus nextStatus, MemberRole nextRole) {
    MemberRole currentRole = safeRole(member);
    MemberStatus currentStatus = safeStatus(member);
    if (adminMemberId != null
        && adminMemberId.equals(member.getId())
        && nextRole != null
        && currentRole == MemberRole.ADMIN
        && nextRole != MemberRole.ADMIN) {
      throw new ServiceException(ERROR_CODE_CONFLICT, ERROR_MSG_CANNOT_CHANGE_OWN_ROLE);
    }

    boolean removesActiveAdminCapability =
        currentRole == MemberRole.ADMIN
            && currentStatus == MemberStatus.ACTIVE
            && ((nextStatus != null && nextStatus != MemberStatus.ACTIVE)
                || (nextRole != null && nextRole != MemberRole.ADMIN));

    if (removesActiveAdminCapability
        && memberRepository.countByRoleAndStatus(MemberRole.ADMIN, MemberStatus.ACTIVE) <= 1) {
      throw new ServiceException(ERROR_CODE_CONFLICT, ERROR_MSG_LAST_ACTIVE_ADMIN_REQUIRED);
    }
  }

  private void saveAdminActionLog(
      Member member,
      Long adminMemberId,
      MemberAdminActionType actionType,
      String beforeValue,
      String afterValue,
      String memo) {
    memberAdminActionLogRepository.save(
        com.back.member.domain.MemberAdminActionLog.create(
            member,
            adminMemberId,
            resolveAdminNickname(adminMemberId),
            actionType,
            beforeValue,
            afterValue,
            memo));
  }

  private String resolveAdminNickname(Long adminMemberId) {
    if (adminMemberId == null) {
      return "system";
    }

    return memberRepository
        .findById(adminMemberId)
        .map(Member::getNickname)
        .orElse("admin#" + adminMemberId);
  }

  private MemberRole safeRole(Member member) {
    return member.getRole() == null ? MemberRole.USER : member.getRole();
  }

  private MemberStatus safeStatus(Member member) {
    return member.getStatus() == null ? MemberStatus.ACTIVE : member.getStatus();
  }

  private record OAuthAccountSnapshot(boolean socialAccount, LocalDateTime lastLoginAt) {
    private static OAuthAccountSnapshot empty() {
      return new OAuthAccountSnapshot(false, null);
    }
  }

  private static final class OAuthAccountSnapshotAccumulator {
    private LocalDateTime lastLoginAt;

    private void accumulate(OAuthAccount oauthAccount) {
      LocalDateTime candidate = oauthAccount.getLastLoginAt();
      if (candidate != null && (lastLoginAt == null || candidate.isAfter(lastLoginAt))) {
        lastLoginAt = candidate;
      }
    }

    private OAuthAccountSnapshot snapshot() {
      return new OAuthAccountSnapshot(true, lastLoginAt);
    }
  }
}
