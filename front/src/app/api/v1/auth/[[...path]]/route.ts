import { NextResponse, type NextRequest } from "next/server";
import {
  applyForwardedHeaders,
  buildSetCookieHeadersForFrontend,
  extractSetCookieHeaders,
  normalizeRefreshTokenCookieHeader,
  resolveRequestHostname,
} from "@/lib/auth/auth-proxy";
import { getServerApiBaseUrl, joinUrl } from "@/lib/runtime/deployment-env";

const BACKEND_API_BASE_URL = getServerApiBaseUrl();
const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "transfer-encoding",
]);
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "location",
  "set-cookie",
  "transfer-encoding",
]);

interface RouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return handleAuthProxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  return handleAuthProxy(request, context);
}

async function handleAuthProxy(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { path: pathSegments = [] } = await context.params;
  const authPath = toAuthPath(pathSegments);
  const requestHostname = resolveRequestHostname(request);

  if (!authPath) {
    return NextResponse.json(
      {
        resultCode: "404-1",
        msg: "Auth proxy target is not found.",
        data: null,
      },
      { status: 404 },
    );
  }

  const upstreamResponse = await fetchUpstreamAuthResponse(request, authPath, {
    redirect: shouldHandleRedirectManually(authPath) ? "manual" : "follow",
  });

  if (shouldHandleRedirectManually(authPath)) {
    return buildRedirectResponse(request, upstreamResponse, requestHostname);
  }

  return buildProxyResponse(upstreamResponse, requestHostname);
}

async function fetchUpstreamAuthResponse(
  request: NextRequest,
  authPath: string,
  options: {
    redirect: RequestRedirect;
  },
): Promise<Response> {
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_REQUEST_HEADERS) {
    headers.delete(header);
  }
  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", normalizeRefreshTokenCookieHeader(cookieHeader));
  }
  applyForwardedHeaders(headers, request.nextUrl);

  const upstreamUrl = new URL(
    `${joinUrl(BACKEND_API_BASE_URL, authPath)}${request.nextUrl.search}`,
  );

  return fetch(upstreamUrl, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    redirect: options.redirect,
    cache: "no-store",
  });
}

function buildRedirectResponse(
  request: NextRequest,
  upstreamResponse: Response,
  requestHostname?: string,
): Response {
  const location = upstreamResponse.headers.get("location");
  if (!location) {
    return buildProxyResponse(upstreamResponse, requestHostname);
  }

  const response = NextResponse.redirect(
    new URL(location, request.url),
    { status: upstreamResponse.status },
  );
  appendRewrittenSetCookieHeaders(
    response.headers,
    upstreamResponse.headers,
    requestHostname,
  );
  return response;
}

function buildProxyResponse(
  upstreamResponse: Response,
  requestHostname?: string,
): Response {
  const responseHeaders = new Headers();

  for (const [key, value] of upstreamResponse.headers.entries()) {
    if (HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      continue;
    }
    responseHeaders.append(key, value);
  }

  appendRewrittenSetCookieHeaders(
    responseHeaders,
    upstreamResponse.headers,
    requestHostname,
  );

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

function appendRewrittenSetCookieHeaders(
  responseHeaders: Headers,
  upstreamHeaders: Headers,
  requestHostname?: string,
): void {
  for (const cookie of extractSetCookieHeaders(upstreamHeaders)) {
    for (const rewrittenCookie of buildSetCookieHeadersForFrontend(cookie, {
      requestHostname,
    })) {
      responseHeaders.append("set-cookie", rewrittenCookie);
    }
  }
}

function shouldHandleRedirectManually(authPath: string): boolean {
  return (
    authPath.startsWith("/api/v1/auth/oidc/authorize/") ||
    authPath.startsWith("/api/v1/auth/oidc/callback/")
  );
}

function toAuthPath(pathSegments: string[]): string | null {
  if (pathSegments.length === 0) {
    return null;
  }

  return `/api/v1/auth/${pathSegments.join("/")}`;
}
