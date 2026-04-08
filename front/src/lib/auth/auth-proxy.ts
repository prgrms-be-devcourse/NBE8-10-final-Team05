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

export function extractCookieNameFromSetCookie(value: string): string | null {
  const separatorIndex = value.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  return value.slice(0, separatorIndex).trim();
}

export function rewriteSetCookieForFrontend(value: string): string {
  return value.replace(/;\s*Domain=[^;]+/gi, "");
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
