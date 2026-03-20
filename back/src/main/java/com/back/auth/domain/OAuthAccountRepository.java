package com.back.auth.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** OAuth 계정 매핑 조회/검증용 JPA 리포지토리. */
public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, Long> {

  /** provider + providerUserId로 외부 계정 매핑을 조회한다. */
  Optional<OAuthAccount> findByProviderAndProviderUserId(String provider, String providerUserId);

  /** member + provider 조합으로 연결된 외부 계정을 조회한다. */
  Optional<OAuthAccount> findByMemberIdAndProvider(Long memberId, String provider);

  /** 특정 회원의 연결된 외부 계정을 생성순으로 조회한다. */
  List<OAuthAccount> findAllByMemberIdOrderByIdAsc(Long memberId);
}
