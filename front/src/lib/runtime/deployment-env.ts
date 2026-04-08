const DEFAULT_PUBLIC_API_BASE_URL = "http://localhost:8080";
const DEFAULT_MONITORING_PROXY_INTERNAL_URL = "http://localhost:3400";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeAbsoluteBaseUrl(
  value: string | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimTrailingSlash(trimmed);
}

export function getPublicApiBaseUrl(): string {
  return normalizeAbsoluteBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    DEFAULT_PUBLIC_API_BASE_URL,
  );
}

export function getAuthApiBaseUrl(): string {
  return normalizeAbsoluteBaseUrl(
    process.env.NEXT_PUBLIC_AUTH_API_BASE_URL,
    "",
  );
}

function getAuthCookieBaseUrl(): string {
  const authApiBaseUrl = getAuthApiBaseUrl();
  if (authApiBaseUrl) {
    return authApiBaseUrl;
  }

  return getPublicApiBaseUrl();
}

function getConfiguredAuthCookieDomain(): string | null {
  const trimmed = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/^\.+/, "").toLowerCase();
}

function isLocalOrIpHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized) ||
    normalized.includes(":")
  );
}

function findSharedCookieDomain(hostA: string, hostB: string): string | null {
  const normalizedA = normalizeHostname(hostA);
  const normalizedB = normalizeHostname(hostB);

  if (
    !normalizedA ||
    !normalizedB ||
    isLocalOrIpHostname(normalizedA) ||
    isLocalOrIpHostname(normalizedB)
  ) {
    return null;
  }

  const labelsA = normalizedA.split(".");
  const labelsB = normalizedB.split(".");
  const sharedLabels: string[] = [];

  while (labelsA.length > 0 && labelsB.length > 0) {
    const nextA = labelsA[labelsA.length - 1];
    const nextB = labelsB[labelsB.length - 1];
    if (nextA !== nextB) {
      break;
    }
    sharedLabels.unshift(nextA);
    labelsA.pop();
    labelsB.pop();
  }

  if (sharedLabels.length < 2) {
    return null;
  }

  return `.${sharedLabels.join(".")}`;
}

export function resolveSharedAuthCookieDomain(frontendHostname: string): string | null {
  const configured = getConfiguredAuthCookieDomain();
  if (configured) {
    return configured;
  }

  try {
    const apiHostname = new URL(getAuthCookieBaseUrl()).hostname;
    return findSharedCookieDomain(frontendHostname, apiHostname);
  } catch {
    return null;
  }
}

export function getServerApiBaseUrl(): string {
  return normalizeAbsoluteBaseUrl(
    process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
    DEFAULT_PUBLIC_API_BASE_URL,
  );
}

export function getMonitoringProxyInternalUrl(): string {
  return normalizeAbsoluteBaseUrl(
    process.env.MONITORING_PROXY_INTERNAL_URL,
    DEFAULT_MONITORING_PROXY_INTERNAL_URL,
  );
}

export function getMonitoringProxyBaseUrl(): string {
  const trimmed = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MONITORING_PROXY_URL?.trim() ?? "",
  );

  return trimmed === "/" ? "" : trimmed;
}

export function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${trimTrailingSlash(baseUrl)}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function joinBasePath(basePath: string, path: string): string {
  const normalizedBasePath = trimTrailingSlash(basePath.trim());
  if (!normalizedBasePath || normalizedBasePath === "/") {
    return path;
  }

  return `${normalizedBasePath}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function toUrlOrigin(baseUrl: string | undefined): string | null {
  if (!baseUrl?.trim()) {
    return null;
  }

  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
}

export function toWebSocketOrigin(baseUrl: string | undefined): string | null {
  const origin = toUrlOrigin(baseUrl);
  if (!origin) {
    return null;
  }

  if (origin.startsWith("https://")) {
    return `wss://${origin.slice("https://".length)}`;
  }

  if (origin.startsWith("http://")) {
    return `ws://${origin.slice("http://".length)}`;
  }

  return null;
}
