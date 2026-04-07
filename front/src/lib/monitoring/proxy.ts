import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_HINT_COOKIE_NAME,
  parseAuthHintCookieValue,
} from "@/lib/auth/auth-hint-cookie";
import { getMonitoringProxyInternalUrl, joinUrl } from "@/lib/runtime/deployment-env";

const MONITORING_PROXY_INTERNAL_URL = getMonitoringProxyInternalUrl();
const GRAFANA_AUTH_PROXY_USER = "maum-on-admin";

export async function proxyMonitoringRequest(
  request: NextRequest,
  prefix: "/grafana" | "/prometheus",
): Promise<Response> {
  const authHint = parseAuthHintCookieValue(
    request.cookies.get(AUTH_HINT_COOKIE_NAME)?.value,
  );

  if (!authHint.isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (!authHint.isAdmin) {
    const forbiddenUrl = new URL("/forbidden", request.url);
    forbiddenUrl.searchParams.set(
      "from",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(forbiddenUrl);
  }

  const targetUrl = new URL(
    `${joinUrl(MONITORING_PROXY_INTERNAL_URL, request.nextUrl.pathname)}${request.nextUrl.search}`,
  );
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  if (prefix === "/grafana") {
    headers.set("X-WEBAUTH-USER", GRAFANA_AUTH_PROXY_USER);
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set("x-maum-on-monitoring-proxy", prefix);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Monitoring upstream is unavailable.", {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
