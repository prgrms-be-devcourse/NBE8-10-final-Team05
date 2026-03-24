package com.back.auth.application;

import java.time.Instant;
import java.util.Optional;

/** OIDC authorize 단계 state 저장/조회/잠금/정리 전략을 추상화한 저장소 인터페이스. */
public interface OidcAuthorizationStateStore {

  /** 신규 state를 저장하거나 기존 state 소비 결과를 덮어쓴다. */
  void save(OidcAuthorizationRequestService.OidcAuthorizationState state);

  /** 일반 조회용 state 조회. */
  Optional<OidcAuthorizationRequestService.OidcAuthorizationState> find(String state);

  /** callback consume 시 경쟁 조건을 막기 위한 잠금 조회. */
  Optional<OidcAuthorizationRequestService.OidcAuthorizationState> findForUpdate(String state);

  /** 특정 state를 삭제한다. */
  void delete(String state);

  /** replay 탐지 목적을 다한 만료+소비 state를 정리한다. */
  void deleteConsumedExpired(Instant now);
}
