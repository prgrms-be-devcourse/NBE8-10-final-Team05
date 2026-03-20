package com.back.auth.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** OAuth 계정 매핑 조회/검증용 JPA 리포지토리. */
public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, Integer> {

  Optional<OAuthAccount> findByProviderAndProviderUserId(String provider, String providerUserId);

  Optional<OAuthAccount> findByMemberIdAndProvider(Integer memberId, String provider);

  List<OAuthAccount> findAllByMemberIdOrderByIdAsc(Integer memberId);
}
