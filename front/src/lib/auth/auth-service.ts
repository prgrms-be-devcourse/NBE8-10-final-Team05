"use client";

import {
  applyAuthTokenPayload,
  applyAuthenticatedMember,
  clearAuthSession,
  getAuthState,
  markRestoreFinished,
  setAuthError,
  setLoggingIn,
  setRestoring,
} from "@/lib/auth/auth-store";
import type {
  AuthMember,
  AuthTokenPayload,
  LoginRequest,
  SignupRequest,
} from "@/lib/auth/types";
import {
  requestData,
  requestVoid,
  configureHttpClient,
} from "@/lib/api/http-client";
import { toErrorMessage } from "@/lib/api/rs-data";

const AUTH_ME_PATH = "/api/v1/auth/me";
const AUTH_SIGNUP_PATH = "/api/v1/auth/signup";
const AUTH_LOGIN_PATH = "/api/v1/auth/login";
const AUTH_LOGOUT_PATH = "/api/v1/auth/logout";
const AUTH_REFRESH_PATH = "/api/v1/auth/refresh";
const AUTH_OIDC_AUTHORIZE_PATH = "/api/v1/auth/oidc/authorize";
const LOGIN_PAGE_PATH = "/login";
const OIDC_CALLBACK_PATH = "/login/callback";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

let restorePromise: Promise<void> | null = null;
let handlersBound = false;

export type OidcProvider = "maum-on-oidc" | "kakao";

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

/** 앱 초기 진입 시 refresh 쿠키를 이용해 세션을 복원한다. */
export async function restoreSession(): Promise<void> {
  bindHttpClientHandlers();

  const current = getAuthState();
  if (current.isRestoring && restorePromise) {
    return restorePromise;
  }

  if (current.hasRestored) {
    return;
  }

  const startedRevision = current.sessionRevision;

  setRestoring(true);
  setAuthError(null);

  restorePromise = (async () => {
    try {
      const payload = await requestData<AuthTokenPayload>(AUTH_REFRESH_PATH, {
        method: "POST",
        skipAuth: true,
        retryOnAuthFailure: false,
        authFailureRedirect: false,
      });
      if (isRestoreResultStillRelevant(startedRevision)) {
        applyAuthTokenPayload(payload);
      }
    } catch {
      // 초기 복원은 비로그인 상태도 정상 케이스이므로 에러를 노출하지 않는다.
      if (isRestoreResultStillRelevant(startedRevision)) {
        clearAuthSession();
      }
    } finally {
      markRestoreFinished();
      restorePromise = null;
    }
  })();

  return restorePromise;
}

/** 회원가입 API를 호출하고 생성된 회원 기본 정보를 반환한다. */
export async function signup(request: SignupRequest): Promise<AuthMember> {
  bindHttpClientHandlers();
  return requestData<AuthMember>(AUTH_SIGNUP_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    skipAuth: true,
    retryOnAuthFailure: false,
    authFailureRedirect: false,
  });
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
    markRestoreFinished();
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
    restorePromise = null;
  }
}

/** 현재 사용자 정보를 재조회한다. auth failure 리다이렉트 정책을 선택할 수 있다. */
export async function fetchMe(options?: {
  authFailureRedirect?: boolean;
}): Promise<AuthMember> {
  bindHttpClientHandlers();
  const member = await requestData<AuthMember>(AUTH_ME_PATH, {
    method: "GET",
    authFailureRedirect: options?.authFailureRedirect,
  });
  applyAuthenticatedMember(member);
  return member;
}

/** 소셜 로그인 authorize 경로로 이동한다. */
export function startOidcLogin(provider: OidcProvider, nextPath: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const callbackUrl = new URL(OIDC_CALLBACK_PATH, window.location.origin);
  if (nextPath.startsWith("/")) {
    callbackUrl.searchParams.set("next", nextPath);
  }

  const authorizeUrl = new URL(
    `${AUTH_OIDC_AUTHORIZE_PATH}/${provider}`,
    API_BASE_URL,
  );
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  window.location.assign(authorizeUrl.toString());
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
  window.location.replace(
    `${LOGIN_PAGE_PATH}?next=${encodeURIComponent(next)}`,
  );
}

function isRestoreResultStillRelevant(startedRevision: number): boolean {
  return getAuthState().sessionRevision === startedRevision;
}
