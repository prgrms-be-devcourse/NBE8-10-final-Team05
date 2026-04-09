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

function normalizeConfiguredCookieDomain(
  configuredDomain: string,
  frontendHostname: string,
): string | null {
  const trimmed = configuredDomain.trim();
  if (!trimmed) {
    return null;
  }

  const prefersSharedCookieDomain = trimmed.startsWith(".");
  const candidate = trimTrailingSlash(trimmed.replace(/^\.+/, ""));
  const configuredHostname = parseConfiguredCookieHostname(candidate);
  if (!configuredHostname || isLocalOrIpHostname(configuredHostname)) {
    return null;
  }

  if (prefersSharedCookieDomain) {
    if (!isHostnameWithinCookieDomain(frontendHostname, configuredHostname)) {
      return null;
    }
    return `.${configuredHostname}`;
  }

  const sharedCookieDomain = findSharedCookieDomain(frontendHostname, configuredHostname);
  if (sharedCookieDomain) {
    return sharedCookieDomain;
  }

  return normalizeHostname(frontendHostname) === configuredHostname
    ? configuredHostname
    : null;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/^\.+/, "").toLowerCase();
}

function parseConfiguredCookieHostname(value: string): string | null {
  try {
    return normalizeHostname(new URL(value).hostname);
  } catch {
    return normalizeHostname(value.replace(/\/.*$/, "").replace(/:\d+$/, ""));
  }
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

function isHostnameWithinCookieDomain(hostname: string, cookieDomainHostname: string): boolean {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedCookieDomain = normalizeHostname(cookieDomainHostname);

  return (
    normalizedHostname === normalizedCookieDomain ||
    normalizedHostname.endsWith(`.${normalizedCookieDomain}`)
  );
}

export function resolveSharedAuthCookieDomain(frontendHostname: string): string | null {
  const configured = getConfiguredAuthCookieDomain();
  if (configured) {
    return normalizeConfiguredCookieDomain(configured, frontendHostname);
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

function inferMonitoringBaseUrlFromPublicApiBaseUrl(): string | null {
  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!publicApiBaseUrl) {
    return null;
  }

  try {
    const apiUrl = new URL(publicApiBaseUrl);
    if (!apiUrl.hostname.startsWith("api.")) {
      return null;
    }

    apiUrl.hostname = `monitor.${apiUrl.hostname.slice("api.".length)}`;
    apiUrl.pathname = "";
    apiUrl.search = "";
    apiUrl.hash = "";

    return trimTrailingSlash(apiUrl.toString());
  } catch {
    return null;
  }
}

function getConfiguredMonitoringProxyAbsoluteUrl(): string | null {
  const trimmed = process.env.NEXT_PUBLIC_MONITORING_PROXY_URL?.trim() ?? "";
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  return trimTrailingSlash(trimmed);
}

export function getMonitoringProxyBaseUrl(): string {
  const trimmed = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MONITORING_PROXY_URL?.trim() ?? "",
  );

  if (trimmed === "/") {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed) {
    if (process.env.NODE_ENV === "development") {
      return "";
    }

    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  if (process.env.NODE_ENV === "production") {
    const inferredMonitoringBaseUrl = inferMonitoringBaseUrlFromPublicApiBaseUrl();
    if (inferredMonitoringBaseUrl) {
      return inferredMonitoringBaseUrl;
    }
  }

  return "";
}

export function getMonitoringProxyInternalUrl(): string | null {
  const configuredInternalUrl = process.env.MONITORING_PROXY_INTERNAL_URL?.trim();
  if (configuredInternalUrl) {
    return trimTrailingSlash(configuredInternalUrl);
  }

  const configuredMonitoringProxyAbsoluteUrl = getConfiguredMonitoringProxyAbsoluteUrl();
  if (configuredMonitoringProxyAbsoluteUrl) {
    return configuredMonitoringProxyAbsoluteUrl;
  }

  const publicMonitoringBaseUrl = getMonitoringProxyBaseUrl();
  if (publicMonitoringBaseUrl) {
    return publicMonitoringBaseUrl;
  }

  const inferredMonitoringBaseUrl = inferMonitoringBaseUrlFromPublicApiBaseUrl();
  if (inferredMonitoringBaseUrl) {
    return inferredMonitoringBaseUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return DEFAULT_MONITORING_PROXY_INTERNAL_URL;
  }

  return null;
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
