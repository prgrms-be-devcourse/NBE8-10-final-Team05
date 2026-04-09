package com.back.auth.application;

import com.back.auth.domain.OAuthAccount;
import com.back.auth.domain.OAuthAccountRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** provider 경계를 유지하면서 OIDC 외부 계정을 내부 회원으로 매핑한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OidcMemberLinkService {

  private static final String FALLBACK_EMAIL_DOMAIN = "@oidc.local";
  private static final String DEFAULT_NICKNAME = "anonymous";
  private static final int MAX_SANITIZED_SUBJECT_LENGTH = 80;
  private static final Pattern UNSAFE_SUBJECT_PATTERN = Pattern.compile("[^a-zA-Z0-9._-]");

  private final OAuthAccountRepository oauthAccountRepository;
  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;
  private final Clock clock;

  @Transactional
  public Member resolveMember(
      String provider,
      String providerUserId,
      String providerEmailClaim,
      String nicknameClaim) {
    String normalizedProvider = normalizeProvider(provider);
    String normalizedProviderUserId = normalizeProviderUserId(providerUserId);
    String providerEmail = normalizeEmailClaim(providerEmailClaim);

    Optional<OAuthAccount> linkedAccount =
        findLinkedAccount(
            normalizedProvider, normalizedProviderUserId, providerEmail, LocalDateTime.now(clock));
    if (linkedAccount.isPresent()) {
      return resolveLinkedMember(
          linkedAccount.get(),
          normalizedProvider,
          normalizedProviderUserId,
          providerEmail,
          nicknameClaim);
    }

    String memberEmail =
        resolveMemberEmail(normalizedProvider, normalizedProviderUserId, providerEmail);
    String nickname =
        normalizeNickname(
            nicknameClaim, providerEmail != null ? providerEmail : memberEmail);
    Member member = createOidcMember(memberEmail, nickname);
    linkProviderAccountIfAbsent(
        member, normalizedProvider, normalizedProviderUserId, providerEmail);
    return member;
  }

  private Optional<OAuthAccount> findLinkedAccount(
      String provider, String providerUserId, String email, LocalDateTime now) {
    return oauthAccountRepository
        .findByProviderAndProviderUserId(provider, providerUserId)
        .map(
            account -> {
              account.touchLastLoginAt(now);
              account.updateEmailAtProvider(email);
              return account;
            });
  }

  private Member resolveLinkedMember(
      OAuthAccount linkedAccount,
      String provider,
      String providerUserId,
      String providerEmail,
      String nicknameClaim) {
    if (!shouldSplitAutoLinkedMember(linkedAccount)) {
      return linkedAccount.getMember();
    }

    String memberEmail = resolveMemberEmail(provider, providerUserId, providerEmail);
    String nickname =
        normalizeNickname(nicknameClaim, providerEmail != null ? providerEmail : memberEmail);
    Member separatedMember = createOidcMember(memberEmail, nickname);
    linkedAccount.reassignMember(separatedMember);
    return separatedMember;
  }

  private boolean shouldSplitAutoLinkedMember(OAuthAccount linkedAccount) {
    return oauthAccountRepository
            .findAllByMemberIdOrderByIdAsc(linkedAccount.getMember().getId())
            .size()
        > 1;
  }

  private String normalizeProvider(String provider) {
    if (!StringUtils.hasText(provider)) {
      throw AuthErrorCode.OIDC_PROVIDER_NOT_SUPPORTED.toException();
    }
    return provider.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeProviderUserId(String providerUserId) {
    if (!StringUtils.hasText(providerUserId)) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }
    return providerUserId.trim();
  }

  private String normalizeEmailClaim(String emailClaim) {
    if (!StringUtils.hasText(emailClaim)) {
      return null;
    }

    return emailClaim.trim().toLowerCase(Locale.ROOT);
  }

  private String resolveMemberEmail(String provider, String providerUserId, String providerEmail) {
    if (providerEmail != null && !memberRepository.existsByEmail(providerEmail)) {
      return providerEmail;
    }

    return buildFallbackEmail(provider, providerUserId);
  }

  private void linkProviderAccountIfAbsent(
      Member member, String provider, String providerUserId, String email) {
    if (oauthAccountRepository.findByMemberIdAndProvider(member.getId(), provider).isPresent()) {
      return;
    }

    oauthAccountRepository.save(OAuthAccount.connect(member, provider, providerUserId, email));
  }

  private Member createOidcMember(String email, String nickname) {
    String generatedPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    Member member = Member.create(email, generatedPasswordHash, nickname);
    return memberRepository.save(member);
  }

  private String buildFallbackEmail(String provider, String providerUserId) {
    String sanitizedSubject = UNSAFE_SUBJECT_PATTERN.matcher(providerUserId).replaceAll("_");
    if (sanitizedSubject.length() > MAX_SANITIZED_SUBJECT_LENGTH) {
      sanitizedSubject = sanitizedSubject.substring(0, MAX_SANITIZED_SUBJECT_LENGTH);
    }
    return provider + "_" + sanitizedSubject + FALLBACK_EMAIL_DOMAIN;
  }

  private String normalizeNickname(String nickname, String emailFallback) {
    if (StringUtils.hasText(nickname)) {
      return nickname.trim();
    }

    int atIndex = emailFallback.indexOf('@');
    if (atIndex > 0) {
      return emailFallback.substring(0, atIndex);
    }
    return DEFAULT_NICKNAME;
  }
}
