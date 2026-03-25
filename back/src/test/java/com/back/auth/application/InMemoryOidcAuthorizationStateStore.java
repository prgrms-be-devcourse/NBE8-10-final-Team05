package com.back.auth.application;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

class InMemoryOidcAuthorizationStateStore implements OidcAuthorizationStateStore {

  private final Map<String, OidcAuthorizationRequestService.OidcAuthorizationState> stateStore =
      new ConcurrentHashMap<>();

  @Override
  public void save(OidcAuthorizationRequestService.OidcAuthorizationState state) {
    stateStore.put(state.state(), state);
  }

  @Override
  public Optional<OidcAuthorizationRequestService.OidcAuthorizationState> find(String state) {
    return Optional.ofNullable(stateStore.get(state));
  }

  @Override
  public Optional<OidcAuthorizationRequestService.OidcAuthorizationState> findForUpdate(
      String state) {
    return find(state);
  }

  @Override
  public void delete(String state) {
    stateStore.remove(state);
  }

  @Override
  public void deleteConsumedExpired(Instant now) {
    stateStore
        .entrySet()
        .removeIf(entry -> entry.getValue().isConsumed() && entry.getValue().isExpired(now));
  }
}
