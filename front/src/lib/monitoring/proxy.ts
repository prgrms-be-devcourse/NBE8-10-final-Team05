import { NextResponse, type NextRequest } from "next/server";
import { SERVER_AUTH_HINT_HEADER } from "@/lib/auth/server-auth-payload";
import { getMonitoringProxyInternalUrl, joinUrl } from "@/lib/runtime/deployment-env";

const MONITORING_PROXY_INTERNAL_URL = getMonitoringProxyInternalUrl();
const GRAFANA_AUTH_PROXY_USER = "maum-on-admin";
const MONITORING_STATUS_HEADER = "x-maum-on-monitoring-status";
const MONITORING_STATUS_DISABLED = "disabled";
const SERVER_AUTH_HINT_ADMIN = "admin";

export async function proxyMonitoringRequest(
  request: NextRequest,
  prefix: "/grafana" | "/prometheus",
): Promise<Response> {
  const serverAuthHint = request.headers.get(SERVER_AUTH_HINT_HEADER);

  if (!serverAuthHint) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (serverAuthHint !== SERVER_AUTH_HINT_ADMIN) {
    const forbiddenUrl = new URL("/forbidden", request.url);
    forbiddenUrl.searchParams.set(
      "from",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(forbiddenUrl);
  }

  if (!MONITORING_PROXY_INTERNAL_URL) {
    return new Response("Monitoring proxy is not configured.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        [MONITORING_STATUS_HEADER]: MONITORING_STATUS_DISABLED,
      },
    });
  }

  const targetUrl = new URL(
    `${joinUrl(MONITORING_PROXY_INTERNAL_URL, request.nextUrl.pathname)}${request.nextUrl.search}`,
  );
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.set("accept-encoding", "identity");

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

    const responseHeaders = normalizeMonitoringResponseHeaders(
      upstreamResponse.headers,
    );
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

function normalizeMonitoringResponseHeaders(headers: Headers): Headers {
  const normalizedHeaders = new Headers(headers);

  // Next/Node fetch can transparently decode gzip/br responses while preserving
  // the original upstream encoding headers. Strip them before streaming the body
  // back to the browser to avoid double-decoding failures.
  normalizedHeaders.delete("content-encoding");
  normalizedHeaders.delete("content-length");
  normalizedHeaders.delete("transfer-encoding");

  return normalizedHeaders;
}
