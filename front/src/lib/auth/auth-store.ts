"use client";

import { useSyncExternalStore } from "react";
import { clearAccessToken, setAccessToken } from "@/lib/auth/token-store";
import {
  type AuthHintState,
  clearAuthHintCookie,
  persistAuthHintCookie,
} from "@/lib/auth/auth-hint-cookie";
import type { AuthMember, AuthState, AuthTokenPayload } from "@/lib/auth/types";

type AuthStoreListener = () => void;

const listeners = new Set<AuthStoreListener>();

const initialState: AuthState = {
  member: null,
  isAuthenticated: false,
  isRestoring: false,
  isLoggingIn: false,
  hasRestored: false,
  errorMessage: null,
  sessionRevision: 0,
};

let authState: AuthState = initialState;

/** 스토어 상태를 갱신하고 구독자에게 변경을 알린다. */
function setState(partial: Partial<AuthState>): void {
  authState = { ...authState, ...partial };
  listeners.forEach((listener) => listener());
}

function shouldAdvanceRevisionForMember(nextMemberId: number): boolean {
  if (!authState.isAuthenticated) {
    return true;
  }

  return authState.member?.id !== nextMemberId;
}

function shouldAdvanceRevisionForSessionClear(): boolean {
  return authState.isAuthenticated || authState.member !== null;
}

/** 현재 인증 상태 스냅샷을 반환한다. */
export function getAuthState(): AuthState {
  return authState;
}

/** 인증 상태 구독을 등록한다. */
export function subscribeAuthState(listener: AuthStoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React 컴포넌트에서 인증 상태를 읽기 위한 훅. */
export function useAuthStore(): AuthState {
  return useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState);
}

/** 로그인/토큰갱신 결과를 스토어에 반영한다. */
export function applyAuthTokenPayload(payload: AuthTokenPayload): void {
  const nextRevision = shouldAdvanceRevisionForMember(payload.member.id)
    ? authState.sessionRevision + 1
    : authState.sessionRevision;
  setAccessToken(payload.accessToken);
  persistAuthHintCookie(payload.member.role);
  setState({
    member: payload.member,
    isAuthenticated: true,
    errorMessage: null,
    sessionRevision: nextRevision,
  });
}

/** 회원 정보만 갱신할 때 사용한다. */
export function applyAuthenticatedMember(member: AuthMember): void {
  const nextRevision = shouldAdvanceRevisionForMember(member.id)
    ? authState.sessionRevision + 1
    : authState.sessionRevision;
  persistAuthHintCookie(member.role);
  setState({
    member,
    isAuthenticated: true,
    errorMessage: null,
    sessionRevision: nextRevision,
  });
}

/** 이미 인증된 회원 정보 일부를 화면 반영용으로 갱신한다. */
export function patchAuthenticatedMember(
  partial: Partial<AuthMember>,
): void {
  if (!authState.member) {
    return;
  }

  setState({
    member: {
      ...authState.member,
      ...partial,
    },
  });
}

/** 서버에서 인증 확인된 요청의 최소 상태를 클라이언트 스토어에 반영한다. */
export function applyAuthenticatedHintState(hint: AuthHintState): void {
  if (!hint.isAuthenticated) {
    return;
  }

  setState({
    isAuthenticated: true,
    errorMessage: null,
  });
}

/** 인증 세션을 완전히 비운다. */
export function clearAuthSession(): void {
  const nextRevision = shouldAdvanceRevisionForSessionClear()
    ? authState.sessionRevision + 1
    : authState.sessionRevision;
  clearAccessToken();
  clearAuthHintCookie();
  setState({
    member: null,
    isAuthenticated: false,
    sessionRevision: nextRevision,
  });
}

/** 세션 복원 진행 상태를 갱신한다. */
export function setRestoring(isRestoring: boolean): void {
  setState({ isRestoring });
}

/** 세션 복원 시도 완료 여부를 표시한다. */
export function markRestoreFinished(): void {
  setState({ hasRestored: true, isRestoring: false });
}

/** 로그인 진행 상태를 갱신한다. */
export function setLoggingIn(isLoggingIn: boolean): void {
  setState({ isLoggingIn });
}

/** 인증 관련 에러 메시지를 기록한다. */
export function setAuthError(errorMessage: string | null): void {
  setState({ errorMessage });
}
