import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  extractCookieNameFromSetCookie,
  extractSetCookieHeaders,
  rewriteSetCookieForFrontend,
} from "@/lib/auth/auth-proxy";
import {
  SERVER_AUTH_HINT_HEADER,
  SERVER_AUTH_PAYLOAD_HEADER,
  serializeServerAuthPayload,
} from "@/lib/auth/server-auth-payload";
import { AUTH_HINT_COOKIE_NAME } from "@/lib/auth/auth-hint-cookie";
import type { AuthTokenPayload } from "@/lib/auth/types";
import {
  getServerApiBaseUrl,
  resolveSharedAuthCookieDomain,
} from "@/lib/runtime/deployment-env";

const BACKEND_BASE_URL = getServerApiBaseUrl();
const REFRESH_PATH = "/api/v1/auth/refresh";
const REFRESH_COOKIE_NAME = "refreshToken";
const AUTH_HINT_MEMBER = "member";
const AUTH_HINT_ADMIN = "admin";

interface RsData<T> {
  resultCode: string;
  msg: string;
  data: T;
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isObservabilityPath(pathname: string): boolean {
  return pathname.startsWith("/grafana") || pathname.startsWith("/prometheus");
}

function isObservabilityApiPath(pathname: string): boolean {
  return pathname.startsWith("/grafana/api/") || pathname.startsWith("/prometheus/api/");
}

function isMemberProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/letters") ||
    pathname.startsWith("/stories/write") ||
    pathname.startsWith("/settings")
  );
}

function isValidAuthHint(value: string | undefined): value is "member" | "admin" {
  return value === AUTH_HINT_MEMBER || value === AUTH_HINT_ADMIN;
}

function buildLoginRedirect(
  request: NextRequest,
  options: { clearRefreshCookie?: boolean } = {},
): NextResponse {
  const nextUrl = request.nextUrl.clone();
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  nextUrl.pathname = "/login";
  nextUrl.search = `?next=${encodeURIComponent(target)}`;

  const response = NextResponse.redirect(nextUrl);
  expireAuthHintCookie(response, request.nextUrl.hostname);

  if (options.clearRefreshCookie) {
    expireRefreshCookie(response, request.nextUrl.hostname);
  }

  return response;
}

function buildForbiddenRedirect(request: NextRequest): NextResponse {
  const nextUrl = request.nextUrl.clone();
  const from = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  nextUrl.pathname = "/forbidden";
  nextUrl.search = `?from=${encodeURIComponent(from)}`;
  return NextResponse.redirect(nextUrl);
}

function buildCookieOptions(
  requestHostname: string,
  overrides: {
    httpOnly?: boolean;
    maxAge?: number;
  } = {},
) {
  const authCookieDomain = resolveSharedAuthCookieDomain(requestHostname);
  return {
    path: "/",
    sameSite: "lax" as const,
    ...(authCookieDomain ? { domain: authCookieDomain } : {}),
    ...overrides,
  };
}

function expireAuthHintCookie(response: NextResponse, requestHostname: string): void {
  response.cookies.set(
    AUTH_HINT_COOKIE_NAME,
    "",
    buildCookieOptions(requestHostname, {
      maxAge: 0,
    }),
  );
}

function setAuthHintCookie(
  response: NextResponse,
  value: "member" | "admin",
  requestHostname: string,
): void {
  response.cookies.set(
    AUTH_HINT_COOKIE_NAME,
    value,
    buildCookieOptions(requestHostname),
  );
}

function expireRefreshCookie(response: NextResponse, requestHostname: string): void {
  response.cookies.set(
    REFRESH_COOKIE_NAME,
    "",
    buildCookieOptions(requestHostname, {
      httpOnly: true,
      maxAge: 0,
    }),
  );
}

function buildUnauthorizedApiResponse(): NextResponse {
  return NextResponse.json(
    {
      resultCode: "401-2",
      msg: "Authentication required.",
      data: null,
    },
    { status: 401 },
  );
}

function buildForbiddenApiResponse(): NextResponse {
  return NextResponse.json(
    {
      resultCode: "403-1",
      msg: "Forbidden.",
      data: null,
    },
    { status: 403 },
  );
}

function buildPassThroughResponse(
  request: NextRequest,
  options: { clearAuthHintCookie?: boolean; clearRefreshCookie?: boolean } = {},
): NextResponse {
  const response = NextResponse.next();

  if (options.clearAuthHintCookie) {
    expireAuthHintCookie(response, request.nextUrl.hostname);
  }

  if (options.clearRefreshCookie) {
    expireRefreshCookie(response, request.nextUrl.hostname);
  }

  return response;
}

async function fetchRefreshedSession(
  request: NextRequest,
): Promise<{
  authPayload: AuthTokenPayload;
  refreshSetCookies: string[];
} | {
  isTokenReuseDetected: boolean;
} | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(new URL(REFRESH_PATH, BACKEND_BASE_URL), {
      method: "POST",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        try {
          const errorPayload = await response.json();
          if (errorPayload?.resultCode === "401-5") {
            return { isTokenReuseDetected: true };
          }
        } catch {
          // ignore json parse error
        }
      }
      return null;
    }

    const payload = (await response.json()) as RsData<AuthTokenPayload>;
    const data = payload?.data;
    if (!data?.accessToken || !data.member?.role) {
      return null;
    }

    return {
      authPayload: data,
      refreshSetCookies: extractSetCookieHeaders(response.headers).filter(
        (value) => extractCookieNameFromSetCookie(value) === REFRESH_COOKIE_NAME,
      ),
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const observabilityApiPath = isObservabilityApiPath(pathname);
  const memberProtectedPath = isMemberProtectedPath(pathname);
  const adminProtectedPath = isAdminPath(pathname) || isObservabilityPath(pathname);
  const authHint = request.cookies.get(AUTH_HINT_COOKIE_NAME)?.value;
  const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshCookie) {
    if (observabilityApiPath) {
      return buildUnauthorizedApiResponse();
    }

    if (adminProtectedPath) {
      return buildLoginRedirect(request);
    }

    if (memberProtectedPath) {
      return buildPassThroughResponse(request, {
        clearAuthHintCookie: isValidAuthHint(authHint),
        clearRefreshCookie: true,
      });
    }

    return NextResponse.next();
  }

  if (!memberProtectedPath && !adminProtectedPath && !observabilityApiPath) {
    return NextResponse.next();
  }

  const isPrefetchRequest = request.headers.get("next-router-prefetch") === "1" || request.headers.get("sec-purpose") === "prefetch";
  if (isPrefetchRequest) {
    return NextResponse.next();
  }

  const session = await fetchRefreshedSession(request);
  
  if (session && "isTokenReuseDetected" in session) {
    // 401-5 에러 발생 시 조용히 쿠키 정리 후 로그인 페이지로 유도
    return buildLoginRedirect(request, { clearRefreshCookie: true });
  }

  if (!session) {
    if (observabilityApiPath) {
      return buildUnauthorizedApiResponse();
    }

    if (adminProtectedPath) {
      return buildLoginRedirect(request, { clearRefreshCookie: true });
    }

    if (memberProtectedPath) {
      return buildPassThroughResponse(request, {
        clearAuthHintCookie: true,
        clearRefreshCookie: true,
      });
    }

    return NextResponse.next();
  }

  if (adminProtectedPath && session.authPayload.member.role !== "ADMIN") {
    if (observabilityApiPath) {
      return buildForbiddenApiResponse();
    }
    return buildForbiddenRedirect(request);
  }

  const hintValue = session.authPayload.member.role === "ADMIN" ? "admin" : "member";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SERVER_AUTH_HINT_HEADER, hintValue);
  requestHeaders.set(
    SERVER_AUTH_PAYLOAD_HEADER,
    serializeServerAuthPayload(session.authPayload),
  );
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  setAuthHintCookie(response, hintValue, request.nextUrl.hostname);

  for (const cookie of session.refreshSetCookies) {
    response.headers.append("set-cookie", rewriteSetCookieForFrontend(cookie));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/dashboard/:path*",
    "/letters/:path*",
    "/stories/write/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/grafana/:path*",
    "/prometheus/:path*",
  ],
};
