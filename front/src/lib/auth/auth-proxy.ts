import { resolveSharedAuthCookieDomain } from "@/lib/runtime/deployment-env";

export const AUTH_API_PREFIX = "/api/v1/auth";

export function isAuthApiPath(path: string): boolean {
  return path === AUTH_API_PREFIX || path.startsWith(`${AUTH_API_PREFIX}/`);
}

export function applyForwardedHeaders(headers: Headers, requestUrl: URL): void {
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));
  headers.set("x-forwarded-host", requestUrl.host);

  if (requestUrl.port) {
    headers.set("x-forwarded-port", requestUrl.port);
    return;
  }

  headers.delete("x-forwarded-port");
}

export function resolveRequestHostname(
  request: {
    headers: Headers;
    nextUrl: URL;
  },
): string {
  const forwardedHost = parseHostname(request.headers.get("x-forwarded-host"));
  if (forwardedHost) {
    return forwardedHost;
  }

  const host = parseHostname(request.headers.get("host"));
  if (host) {
    return host;
  }

  return request.nextUrl.hostname;
}

export function extractCookieNameFromSetCookie(value: string): string | null {
  const separatorIndex = value.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  return value.slice(0, separatorIndex).trim();
}

export function rewriteSetCookieForFrontend(
  value: string,
  options: {
    requestHostname?: string;
  } = {},
): string {
  const withoutDomain = value.replace(/;\s*Domain=[^;]+/gi, "");
  const sharedCookieDomain = options.requestHostname
    ? resolveSharedAuthCookieDomain(options.requestHostname)
    : null;

  if (!sharedCookieDomain) {
    return withoutDomain;
  }

  return `${withoutDomain}; Domain=${sharedCookieDomain}`;
}

export function buildSetCookieHeadersForFrontend(
  value: string,
  options: {
    requestHostname?: string;
  } = {},
): string[] {
  const rewrittenCookie = rewriteSetCookieForFrontend(value, options);
  const sharedCookieDomain = options.requestHostname
    ? resolveSharedAuthCookieDomain(options.requestHostname)
    : null;
  const cookieName = extractCookieNameFromSetCookie(value);

  if (!sharedCookieDomain || !cookieName) {
    return [rewrittenCookie];
  }

  return [rewrittenCookie, buildHostOnlyCookieExpiration(cookieName, value)];
}

export function extractSetCookieHeaders(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie
      .call(headers)
      .flatMap((value) => splitCombinedSetCookieHeader(value))
      .filter(Boolean);
    if (values.length > 0) {
      return values;
    }
  }

  const combined = headers.get("set-cookie");
  if (!combined) {
    return [];
  }

  return splitCombinedSetCookieHeader(combined);
}

function splitCombinedSetCookieHeader(value: string): string[] {
  const parts: string[] = [];
  let segmentStart = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== ",") {
      continue;
    }

    const remaining = value.slice(index + 1);
    const nextSemicolonIndex = remaining.indexOf(";");
    const candidate =
      nextSemicolonIndex >= 0
        ? remaining.slice(0, nextSemicolonIndex).trim()
        : remaining.trim();

    if (!/^[^=]+=/.test(candidate)) {
      continue;
    }

    parts.push(value.slice(segmentStart, index).trim());
    segmentStart = index + 1;
  }

  const lastPart = value.slice(segmentStart).trim();
  if (lastPart) {
    parts.push(lastPart);
  }

  return parts;
}

function buildHostOnlyCookieExpiration(cookieName: string, sourceCookie: string): string {
  const pathMatch = sourceCookie.match(/;\s*Path=([^;]+)/i);
  const sameSiteMatch = sourceCookie.match(/;\s*SameSite=([^;]+)/i);
  const attributes = [
    `${cookieName}=`,
    `Path=${pathMatch?.[1] ?? "/"}`,
    "Max-Age=0",
  ];

  if (/;\s*HttpOnly/i.test(sourceCookie)) {
    attributes.push("HttpOnly");
  }

  if (/;\s*Secure/i.test(sourceCookie)) {
    attributes.push("Secure");
  }

  if (sameSiteMatch?.[1]) {
    attributes.push(`SameSite=${sameSiteMatch[1]}`);
  }

  return attributes.join("; ");
}

function parseHostname(value: string | null): string | null {
  const candidate = value?.split(",")[0]?.trim();
  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate.includes("://") ? candidate : `http://${candidate}`).hostname;
  } catch {
    return null;
  }
}
