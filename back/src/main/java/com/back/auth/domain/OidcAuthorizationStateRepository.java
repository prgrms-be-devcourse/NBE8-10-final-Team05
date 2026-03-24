package com.back.auth.domain;

import java.time.Instant;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** OIDC authorize state 저장 엔티티의 JPA 리포지토리. */
public interface OidcAuthorizationStateRepository
    extends JpaRepository<OidcAuthorizationStateEntity, String> {

  /** callback consume 시 state row를 비관적 잠금으로 조회한다. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select state from OidcAuthorizationStateEntity state where state.state = :state")
  Optional<OidcAuthorizationStateEntity> findByStateForUpdate(@Param("state") String state);

  /** replay 탐지 목적을 다한 만료+소비 state를 일괄 삭제한다. */
  void deleteAllByConsumedAtIsNotNullAndExpiresAtLessThanEqual(Instant now);
}
