import { resolveSharedAuthCookieDomain } from "@/lib/runtime/deployment-env";

export const AUTH_API_PREFIX = "/api/v1/auth";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

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

export function normalizeRefreshTokenCookieHeader(cookieHeader: string): string {
  const entries = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) {
        return null;
      }

      return {
        name: part.slice(0, separatorIndex).trim(),
        value: part.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((entry): entry is { name: string; value: string } => entry !== null);

  const refreshTokens = entries
    .filter((entry) => entry.name === REFRESH_TOKEN_COOKIE_NAME)
    .map((entry) => entry.value)
    .filter(Boolean);

  if (refreshTokens.length <= 1) {
    return cookieHeader;
  }

  const canonicalRefreshToken = selectMostRecentRefreshToken(refreshTokens);
  let hasWrittenRefreshToken = false;
  const normalizedEntries: string[] = [];

  for (const entry of entries) {
    if (entry.name !== REFRESH_TOKEN_COOKIE_NAME) {
      normalizedEntries.push(`${entry.name}=${entry.value}`);
      continue;
    }

    if (hasWrittenRefreshToken) {
      continue;
    }

    normalizedEntries.push(`${entry.name}=${canonicalRefreshToken}`);
    hasWrittenRefreshToken = true;
  }

  return normalizedEntries.join("; ");
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

function selectMostRecentRefreshToken(tokens: string[]): string {
  return tokens
    .map((token, index) => ({
      token,
      issuedAt: readJwtNumericClaim(token, "iat") ?? Number.NEGATIVE_INFINITY,
      expiresAt: readJwtNumericClaim(token, "exp") ?? Number.NEGATIVE_INFINITY,
      index,
    }))
    .sort((left, right) => {
      if (left.issuedAt !== right.issuedAt) {
        return right.issuedAt - left.issuedAt;
      }

      if (left.expiresAt !== right.expiresAt) {
        return right.expiresAt - left.expiresAt;
      }

      return right.index - left.index;
    })[0]?.token ?? tokens[tokens.length - 1];
}

function readJwtNumericClaim(token: string, claimName: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }

  try {
    const decodedPayload = decodeBase64Url(payload);
    const parsedPayload = JSON.parse(decodedPayload) as Record<string, unknown>;
    const claimValue = parsedPayload[claimName];
    return typeof claimValue === "number" && Number.isFinite(claimValue)
      ? claimValue
      : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
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
