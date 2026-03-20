"use client";

import {
  applyAuthenticatedMember,
  applyAuthTokenPayload,
  clearAuthSession,
  getAuthState,
  markRestoreFinished,
  setAuthError,
  setLoggingIn,
  setRestoring,
} from "@/lib/auth/auth-store";
import type { AuthMember, AuthTokenPayload, LoginRequest } from "@/lib/auth/types";
import { requestData, requestVoid, configureHttpClient } from "@/lib/api/http-client";
import { toErrorMessage } from "@/lib/api/rs-data";

const AUTH_ME_PATH = "/api/v1/auth/me";
const AUTH_LOGIN_PATH = "/api/v1/auth/login";
const AUTH_LOGOUT_PATH = "/api/v1/auth/logout";
const LOGIN_PAGE_PATH = "/login";

let restorePromise: Promise<void> | null = null;
let handlersBound = false;

/** 인터셉터의 인증 실패/refresh 성공 이벤트를 스토어 정책과 연결한다. */
function bindHttpClientHandlers(): void {
  if (handlersBound) {
    return;
  }

  handlersBound = true;
  configureHttpClient({
    onRefreshSuccess: (payload) => {
      applyAuthTokenPayload(payload);
    },
    onAuthFailure: () => {
      clearAuthSession();
      redirectToLoginIfNeeded();
    },
  });
}

/** 앱 초기 진입 시 현재 세션(/auth/me)을 복원한다. */
export async function restoreSession(): Promise<void> {
  bindHttpClientHandlers();

  const current = getAuthState();
  if (current.isRestoring && restorePromise) {
    return restorePromise;
  }

  if (current.hasRestored) {
    return;
  }

  setRestoring(true);
  setAuthError(null);

  restorePromise = (async () => {
    try {
      const member = await requestData<AuthMember>(AUTH_ME_PATH, {
        method: "GET",
        authFailureRedirect: false,
      });
      applyAuthenticatedMember(member);
    } catch {
      // 초기 복원은 비로그인 상태도 정상 케이스이므로 에러를 노출하지 않는다.
      clearAuthSession();
    } finally {
      markRestoreFinished();
      restorePromise = null;
    }
  })();

  return restorePromise;
}

/** 로그인 API 호출 후 access 토큰/회원 상태를 스토어에 반영한다. */
export async function login(request: LoginRequest): Promise<void> {
  bindHttpClientHandlers();
  setLoggingIn(true);
  setAuthError(null);

  try {
    const payload = await requestData<AuthTokenPayload>(AUTH_LOGIN_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      skipAuth: true,
      retryOnAuthFailure: false,
      authFailureRedirect: false,
    });
    applyAuthTokenPayload(payload);
  } catch (error) {
    setAuthError(toErrorMessage(error));
    throw error;
  } finally {
    setLoggingIn(false);
  }
}

/** 로그아웃 API를 호출하고 로컬 인증 상태를 정리한다. */
export async function logout(): Promise<void> {
  bindHttpClientHandlers();

  try {
    await requestVoid(AUTH_LOGOUT_PATH, {
      method: "POST",
      skipAuth: true,
      retryOnAuthFailure: false,
      authFailureRedirect: false,
    });
  } finally {
    clearAuthSession();
  }
}

/** 보호 페이지에서 현재 사용자 정보를 강제로 재조회할 때 사용한다. */
export async function fetchMe(): Promise<AuthMember> {
  bindHttpClientHandlers();
  const member = await requestData<AuthMember>(AUTH_ME_PATH, {
    method: "GET",
  });
  applyAuthenticatedMember(member);
  return member;
}

/** 인증 실패 시 로그인 페이지로 일관되게 보낸다. */
function redirectToLoginIfNeeded(): void {
  if (typeof window === "undefined") {
    return;
  }

  const pathname = window.location.pathname;
  const search = window.location.search;
  if (pathname === LOGIN_PAGE_PATH) {
    return;
  }

  const next = `${pathname}${search}`;
  window.location.replace(`${LOGIN_PAGE_PATH}?next=${encodeURIComponent(next)}`);
}
