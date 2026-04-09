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
const LOGIN_CALLBACK_PAGE_PATH = "/login/callback";
const FORBIDDEN_PAGE_PATH = "/forbidden";
const DEFAULT_NEXT_PATH = "/dashboard";
const OIDC_POPUP_MODE = "popup";
const OIDC_POPUP_MESSAGE_TYPE = "maum-on:oidc-popup-result";
const OIDC_POPUP_WINDOW_NAME = "maum-on-oidc-popup";
const OIDC_POPUP_WIDTH = 520;
const OIDC_POPUP_HEIGHT = 720;

let restorePromise: Promise<void> | null = null;
let handlersBound = false;

export type OidcProvider = "maum-on-oidc" | "kakao";
export type OidcPopupStatus = "success" | "error";

interface RestoreSessionOptions {
  force?: boolean;
}

export interface StartOidcLoginOptions {
  popup?: boolean;
}

export interface OidcPopupMessage {
  type: typeof OIDC_POPUP_MESSAGE_TYPE;
  status: OidcPopupStatus;
  nextPath: string;
  errorMessage?: string;
}

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
    onAuthorizationFailure: () => {
      redirectToForbiddenIfNeeded();
    },
  });
}

/** 앱 부팅 시 HTTP 클라이언트 인증 이벤트 연결을 보장한다. */
export function initializeAuthRuntime(): void {
  bindHttpClientHandlers();
}

/** 앱 초기 진입 시 refresh 쿠키를 이용해 세션을 복원한다. */
export async function restoreSession(
  options: RestoreSessionOptions = {},
): Promise<void> {
  bindHttpClientHandlers();

  const current = getAuthState();
  if (current.isRestoring && restorePromise) {
    return restorePromise;
  }

  if (current.hasRestored && options.force !== true) {
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

/** 브라우저 네비게이션 기반으로 로그아웃을 제출해 refresh 쿠키를 확실히 정리한다. */
export function redirectToLogout(nextPath = "/login"): void {
  if (typeof document === "undefined") {
    return;
  }

  const normalizedNextPath = nextPath.startsWith("/") ? nextPath : "/login";
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/logout?next=${encodeURIComponent(normalizedNextPath)}`;
  form.style.display = "none";
  document.body.appendChild(form);
  form.submit();
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
export function startOidcLogin(
  provider: OidcProvider,
  nextPath: string,
  options: StartOidcLoginOptions = {},
): Window | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (options.popup === true) {
    const popupAuthorizeUrl = buildOidcAuthorizeUrl(provider, nextPath, true);
    const popupWindow = window.open(
      popupAuthorizeUrl.toString(),
      OIDC_POPUP_WINDOW_NAME,
      buildOidcPopupFeatures(),
    );
    if (popupWindow) {
      popupWindow.focus();
      return popupWindow;
    }
  }

  const authorizeUrl = buildOidcAuthorizeUrl(provider, nextPath, false);
  window.location.assign(authorizeUrl.toString());
  return null;
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

function redirectToForbiddenIfNeeded(): void {
  if (typeof window === "undefined") {
    return;
  }

  const pathname = window.location.pathname;
  if (pathname === LOGIN_PAGE_PATH || pathname === FORBIDDEN_PAGE_PATH) {
    return;
  }

  const search = window.location.search;
  const from = `${pathname}${search}`;
  window.location.replace(
    `${FORBIDDEN_PAGE_PATH}?from=${encodeURIComponent(from)}`,
  );
}

function isRestoreResultStillRelevant(startedRevision: number): boolean {
  return getAuthState().sessionRevision === startedRevision;
}

export function supportsOidcPopup(provider: OidcProvider): boolean {
  return provider === "maum-on-oidc" || provider === "kakao";
}

export function isOidcPopupCallback(searchParams: URLSearchParams): boolean {
  return searchParams.get("mode") === OIDC_POPUP_MODE;
}

export function createOidcPopupMessage(
  status: OidcPopupStatus,
  nextPath: string,
  errorMessage?: string,
): OidcPopupMessage {
  return {
    type: OIDC_POPUP_MESSAGE_TYPE,
    status,
    nextPath: sanitizeNextPath(nextPath),
    ...(errorMessage ? { errorMessage } : {}),
  };
}

export function isOidcPopupMessage(value: unknown): value is OidcPopupMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<OidcPopupMessage>;
  return (
    candidate.type === OIDC_POPUP_MESSAGE_TYPE &&
    (candidate.status === "success" || candidate.status === "error") &&
    typeof candidate.nextPath === "string"
  );
}

export function notifyOidcPopupResult(message: OidcPopupMessage): boolean {
  if (typeof window === "undefined" || !window.opener) {
    return false;
  }

  window.opener.postMessage(message, window.location.origin);
  return true;
}

function buildOidcAuthorizeUrl(
  provider: OidcProvider,
  nextPath: string,
  popup: boolean,
): URL {
  const redirectUrl = popup
    ? buildOidcPopupCallbackUrl(nextPath)
    : new URL(sanitizeNextPath(nextPath), window.location.origin);
  const authorizeUrl = new URL(
    `${AUTH_OIDC_AUTHORIZE_PATH}/${provider}`,
    window.location.origin,
  );
  authorizeUrl.searchParams.set("redirect_uri", redirectUrl.toString());
  return authorizeUrl;
}

function buildOidcPopupCallbackUrl(nextPath: string): URL {
  const redirectUrl = new URL(LOGIN_CALLBACK_PAGE_PATH, window.location.origin);
  redirectUrl.searchParams.set("mode", OIDC_POPUP_MODE);
  redirectUrl.searchParams.set("next", sanitizeNextPath(nextPath));
  return redirectUrl;
}

function sanitizeNextPath(nextPath: string): string {
  return nextPath.startsWith("/") ? nextPath : DEFAULT_NEXT_PATH;
}

function buildOidcPopupFeatures(): string {
  const left = Math.max(
    0,
    window.screenX + Math.round((window.outerWidth - OIDC_POPUP_WIDTH) / 2),
  );
  const top = Math.max(
    0,
    window.screenY + Math.round((window.outerHeight - OIDC_POPUP_HEIGHT) / 2),
  );

  return [
    `width=${OIDC_POPUP_WIDTH}`,
    `height=${OIDC_POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}
