import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/token-store";
import { isAuthApiPath } from "@/lib/auth/auth-proxy";
import type { AuthTokenPayload } from "@/lib/auth/types";
import { ApiError, type RsData } from "@/lib/api/rs-data";
import {
  getAuthApiBaseUrl,
  getPublicApiBaseUrl,
  joinUrl,
} from "@/lib/runtime/deployment-env";

const API_BASE_URL = getPublicApiBaseUrl();
const AUTH_API_BASE_URL = getAuthApiBaseUrl();
const REFRESH_PATH = "/api/v1/auth/refresh";

type AuthFailureReason = "refresh_failed" | "unauthorized";

interface AuthFailureContext {
  reason: AuthFailureReason;
  status: number;
  resultCode?: string;
}

interface AuthorizationFailureContext {
  status: number;
  resultCode?: string;
}

interface HttpClientEventHandlers {
  onAuthFailure?: (context: AuthFailureContext) => void;
  onAuthorizationFailure?: (context: AuthorizationFailureContext) => void;
  onRefreshSuccess?: (payload: AuthTokenPayload) => void;
}

interface RequestOptions extends Omit<RequestInit, "headers"> {
  headers?: HeadersInit;
  skipAuth?: boolean;
  retryOnAuthFailure?: boolean;
  authFailureRedirect?: boolean;
  authorizationFailureRedirect?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;
let pendingRefreshShouldNotify = false;
let eventHandlers: HttpClientEventHandlers = {};
let lastAuthFailureNotifiedAt = 0;
let lastAuthorizationFailureNotifiedAt = 0;

/** 인증 실패 이벤트 핸들러를 등록한다. */
export function configureHttpClient(nextHandlers: HttpClientEventHandlers): void {
  eventHandlers = { ...eventHandlers, ...nextHandlers };
}

/** RsData 응답을 data 타입으로 풀어 반환하는 기본 요청 함수. */
export async function requestData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await executeRequest(path, options);
  const payload = await parseResponseBody<T>(response);

  if (!response.ok) {
    const message = payload?.msg ?? "요청 처리에 실패했습니다.";
    const resultCode = payload?.resultCode;

    if (response.status === 401 && options.authFailureRedirect !== false) {
      notifyAuthFailure({
        reason: "unauthorized",
        status: response.status,
        resultCode,
      });
    }

    if (response.status === 403 && options.authorizationFailureRedirect !== false) {
      notifyAuthorizationFailure({
        status: response.status,
        resultCode,
      });
    }

    throw new ApiError(message, response.status, resultCode);
  }

  if (!payload) {
    throw new ApiError("응답 본문이 비어 있습니다.", response.status);
  }

  return payload.data;
}

/** RsData 응답 중 data가 없는 성공 응답을 처리한다. */
export async function requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  const response = await executeRequest(path, options);
  const payload = await parseResponseBody<null>(response);

  if (!response.ok) {
    const message = payload?.msg ?? "요청 처리에 실패했습니다.";
    const resultCode = payload?.resultCode;

    if (response.status === 401 && options.authFailureRedirect !== false) {
      notifyAuthFailure({
        reason: "unauthorized",
        status: response.status,
        resultCode,
      });
    }

    if (response.status === 403 && options.authorizationFailureRedirect !== false) {
      notifyAuthorizationFailure({
        status: response.status,
        resultCode,
      });
    }

    throw new ApiError(message, response.status, resultCode);
  }
}

/** access 토큰 헤더를 붙여 요청하고, 401이면 refresh 1회 후 재시도한다. */
async function executeRequest(path: string, options: RequestOptions): Promise<Response> {
  const retryOnAuthFailure = options.retryOnAuthFailure ?? true;
  const shouldAttachAuth = options.skipAuth !== true;
  const response = await fetchWithAuth(path, options, shouldAttachAuth);

  if (!shouldAttemptRefresh(path, response.status, retryOnAuthFailure)) {
    return response;
  }

  const refreshed = await refreshAccessToken(options.authFailureRedirect !== false);
  if (!refreshed) {
    return response;
  }

  return fetchWithAuth(path, { ...options, retryOnAuthFailure: false }, true);
}

/** 실제 fetch 호출을 수행한다. */
function fetchWithAuth(
    path: string,
    options: RequestOptions,
    shouldAttachAuth: boolean): Promise<Response> {
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();

  if (shouldAttachAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(buildUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });
}

/** refresh 시도가 가능한 요청인지 판단한다. */
function shouldAttemptRefresh(path: string, status: number, retryOnAuthFailure: boolean): boolean {
  if (status !== 401) {
    return false;
  }

  if (!retryOnAuthFailure) {
    return false;
  }

  if (path === REFRESH_PATH) {
    return false;
  }

  return true;
}

/** 동시 요청에서 refresh 호출을 1회로 묶는 single-flight 로직. */
async function refreshAccessToken(shouldNotifyFailure: boolean): Promise<boolean> {
  pendingRefreshShouldNotify = pendingRefreshShouldNotify || shouldNotifyFailure;

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(buildUrl(REFRESH_PATH), {
      method: "POST",
      credentials: "include",
    });

    const payload = await parseResponseBody<AuthTokenPayload>(response);

    if (!response.ok || !payload?.data?.accessToken) {
      clearAccessToken();
      if (pendingRefreshShouldNotify) {
        notifyAuthFailure({
          reason: "refresh_failed",
          status: response.status,
          resultCode: payload?.resultCode,
        });
      }
      return false;
    }

    setAccessToken(payload.data.accessToken);
    eventHandlers.onRefreshSuccess?.(payload.data);
    return true;
  })()
      .catch((error: unknown) => {
        clearAccessToken();
        if (pendingRefreshShouldNotify) {
          notifyAuthFailure({
            reason: "refresh_failed",
            status: 401,
          });
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
        pendingRefreshShouldNotify = false;
      });

  try {
    return await refreshPromise;
  } catch {
    return false;
  }
}

/** 인증 실패 이벤트를 과도하게 중복 발행하지 않도록 제한한다. */
function notifyAuthFailure(context: AuthFailureContext): void {
  const now = Date.now();
  if (now - lastAuthFailureNotifiedAt < 700) {
    return;
  }

  lastAuthFailureNotifiedAt = now;
  eventHandlers.onAuthFailure?.(context);
}

/** 권한 부족 이벤트를 과도하게 중복 발행하지 않도록 제한한다. */
function notifyAuthorizationFailure(context: AuthorizationFailureContext): void {
  const now = Date.now();
  if (now - lastAuthorizationFailureNotifiedAt < 700) {
    return;
  }

  lastAuthorizationFailureNotifiedAt = now;
  eventHandlers.onAuthorizationFailure?.(context);
}

/** 응답 본문을 RsData 형식으로 파싱한다. */
async function parseResponseBody<T>(response: Response): Promise<RsData<T> | null> {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as RsData<T>;
  } catch {
    throw new ApiError("응답 본문 파싱에 실패했습니다.", response.status);
  }
}

/** API base URL을 기준으로 절대 URL을 만든다. */
function buildUrl(path: string): string {
  if (isAuthApiPath(path)) {
    return joinUrl(AUTH_API_BASE_URL, path);
  }

  return joinUrl(API_BASE_URL, path);
}
