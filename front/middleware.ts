import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_HINT_COOKIE_NAME } from "@/lib/auth/auth-hint-cookie";

const BACKEND_BASE_URL =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";
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
  response.cookies.set(AUTH_HINT_COOKIE_NAME, "", {
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  if (options.clearRefreshCookie) {
    response.cookies.set(REFRESH_COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
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
  response.cookies.set(AUTH_HINT_COOKIE_NAME, hintValue, {
    path: "/",
    sameSite: "lax",
  });

  if (session.refreshSetCookie) {
    response.headers.append("set-cookie", session.refreshSetCookie);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/letters/:path*",
    "/stories/write/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/grafana/:path*",
    "/prometheus/:path*",
  ],
};
