package com.back.auth.application;

import com.back.auth.domain.OidcAuthorizationStateEntity;
import com.back.auth.domain.OidcAuthorizationStateRepository;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** OIDC authorize state를 DB에 저장하는 JPA 기반 저장소 구현체. */
@Service
@RequiredArgsConstructor
public class JpaOidcAuthorizationStateStore implements OidcAuthorizationStateStore {

  private final OidcAuthorizationStateRepository repository;

  @Override
  public void save(OidcAuthorizationRequestService.OidcAuthorizationState state) {
    repository.save(OidcAuthorizationStateEntity.from(state));
  }

  @Override
  public Optional<OidcAuthorizationRequestService.OidcAuthorizationState> find(String state) {
    return repository.findById(state).map(OidcAuthorizationStateEntity::toModel);
  }

  @Override
  public Optional<OidcAuthorizationRequestService.OidcAuthorizationState> findForUpdate(
      String state) {
    return repository.findByStateForUpdate(state).map(OidcAuthorizationStateEntity::toModel);
  }

  @Override
  public void delete(String state) {
    repository.deleteById(state);
  }

  @Override
  public void deleteConsumedExpired(Instant now) {
    repository.deleteAllByConsumedAtIsNotNullAndExpiresAtLessThanEqual(now);
  }
}
