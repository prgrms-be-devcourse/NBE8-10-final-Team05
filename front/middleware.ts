import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_HINT_COOKIE_NAME } from "@/lib/auth/auth-hint-cookie";
import {
  getServerApiBaseUrl,
  resolveSharedAuthCookieDomain,
} from "@/lib/runtime/deployment-env";

const BACKEND_BASE_URL = getServerApiBaseUrl();
const REFRESH_PATH = "/api/v1/auth/refresh";
const REFRESH_COOKIE_NAME = "refreshToken";
const AUTH_HINT_MEMBER = "member";
const AUTH_HINT_ADMIN = "admin";

interface AuthMember {
  role: string;
}

interface AuthRefreshData {
  accessToken: string;
  member: AuthMember;
}

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

async function fetchRefreshedSession(
  request: NextRequest,
): Promise<{
  memberRole: string;
  refreshSetCookie: string | null;
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
      return null;
    }

    const payload = (await response.json()) as RsData<AuthRefreshData>;
    const data = payload?.data;
    if (!data?.accessToken || !data.member?.role) {
      return null;
    }

    return {
      memberRole: data.member.role,
      refreshSetCookie: response.headers.get("set-cookie"),
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const observabilityApiPath = isObservabilityApiPath(pathname);
  const authHint = request.cookies.get(AUTH_HINT_COOKIE_NAME)?.value;
  if (!isValidAuthHint(authHint)) {
    if (observabilityApiPath) {
      return buildUnauthorizedApiResponse();
    }
    return buildLoginRedirect(request, { clearRefreshCookie: true });
  }

  const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshCookie) {
    if (observabilityApiPath) {
      return buildUnauthorizedApiResponse();
    }
    return buildLoginRedirect(request);
  }

  const session = await fetchRefreshedSession(request);
  if (!session) {
    if (observabilityApiPath) {
      return buildUnauthorizedApiResponse();
    }
    return buildLoginRedirect(request, { clearRefreshCookie: true });
  }

  if (
    (isAdminPath(pathname) || isObservabilityPath(pathname)) &&
    session.memberRole !== "ADMIN"
  ) {
    if (observabilityApiPath) {
      return buildForbiddenApiResponse();
    }
    return buildForbiddenRedirect(request);
  }

  const hintValue = session.memberRole === "ADMIN" ? "admin" : "member";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-maum-on-server-auth", hintValue);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  setAuthHintCookie(response, hintValue, request.nextUrl.hostname);

  if (session.refreshSetCookie) {
    response.headers.append("set-cookie", session.refreshSetCookie);
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
