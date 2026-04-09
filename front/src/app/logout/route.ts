import { NextResponse, type NextRequest } from "next/server";
import { AUTH_HINT_COOKIE_NAME } from "@/lib/auth/auth-hint-cookie";
import {
  applyForwardedHeaders,
  buildSetCookieHeadersForFrontend,
  extractSetCookieHeaders,
  normalizeRefreshTokenCookieHeader,
  resolveRequestHostname,
} from "@/lib/auth/auth-proxy";
import {
  getServerApiBaseUrl,
  joinUrl,
  resolveSharedAuthCookieDomain,
} from "@/lib/runtime/deployment-env";

const BACKEND_API_BASE_URL = getServerApiBaseUrl();
const BACKEND_LOGOUT_PATH = "/api/v1/auth/logout";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

function resolveNextPath(request: NextRequest): string {
  const next = request.nextUrl.searchParams.get("next");
  return next && next.startsWith("/") ? next : "/login";
}

function buildCookieOptions(requestHostname: string) {
  const authCookieDomain = resolveSharedAuthCookieDomain(requestHostname);
  return {
    path: "/",
    sameSite: "lax" as const,
    ...(authCookieDomain ? { domain: authCookieDomain } : {}),
  };
}

function expireCookie(
  response: NextResponse,
  requestHostname: string,
  name: string,
  options: {
    httpOnly?: boolean;
  } = {},
): void {
  response.cookies.set(name, "", {
    ...buildCookieOptions(requestHostname),
    ...options,
    maxAge: 0,
  });
}

async function forwardLogout(request: NextRequest): Promise<Response | null> {
  try {
    const headers = new Headers();
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      headers.set("cookie", normalizeRefreshTokenCookieHeader(cookieHeader));
    }
    applyForwardedHeaders(headers, request.nextUrl);

    return await fetch(joinUrl(BACKEND_API_BASE_URL, BACKEND_LOGOUT_PATH), {
      method: "POST",
      headers,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

function appendUpstreamSetCookieHeaders(
  response: NextResponse,
  upstreamResponse: Response | null,
  requestHostname: string,
): void {
  if (!upstreamResponse) {
    return;
  }

  for (const cookie of extractSetCookieHeaders(upstreamResponse.headers)) {
    for (const rewrittenCookie of buildSetCookieHeadersForFrontend(cookie, {
      requestHostname,
    })) {
      response.headers.append("set-cookie", rewrittenCookie);
    }
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestHostname = resolveRequestHostname(request);
  const nextPath = resolveNextPath(request);
  const redirectUrl = new URL(nextPath, request.url);
  const upstreamResponse = await forwardLogout(request);

  const response = NextResponse.redirect(redirectUrl, {
    status: upstreamResponse?.ok ? 303 : 302,
  });

  appendUpstreamSetCookieHeaders(response, upstreamResponse, requestHostname);

  // Upstream 응답이 실패하거나 누락돼도 브라우저 쪽 인증 쿠키는 확실히 비운다.
  expireCookie(response, requestHostname, REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
  });
  expireCookie(response, requestHostname, AUTH_HINT_COOKIE_NAME);

  return response;
}
