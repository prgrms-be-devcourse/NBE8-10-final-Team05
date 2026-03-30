import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_HINT_COOKIE_NAME } from "@/lib/auth/auth-hint-cookie";

const BACKEND_BASE_URL =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";
const REFRESH_PATH = "/api/v1/auth/refresh";
const REFRESH_COOKIE_NAME = "refreshToken";

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

function buildLoginRedirect(request: NextRequest): NextResponse {
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
  return response;
}

function buildForbiddenRedirect(request: NextRequest): NextResponse {
  const nextUrl = request.nextUrl.clone();
  const from = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  nextUrl.pathname = "/forbidden";
  nextUrl.search = `?from=${encodeURIComponent(from)}`;
  return NextResponse.redirect(nextUrl);
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
  const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshCookie) {
    return buildLoginRedirect(request);
  }

  const session = await fetchRefreshedSession(request);
  if (!session) {
    return buildLoginRedirect(request);
  }

  if (isAdminPath(request.nextUrl.pathname) && session.memberRole !== "ADMIN") {
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
  ],
};
