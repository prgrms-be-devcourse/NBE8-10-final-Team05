import { beforeEach, describe, expect, it, vi } from "vitest";

describe("deployment-env", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("공개 API 기본값은 로컬 백엔드 주소를 사용한다", async () => {
    const {
      getAuthApiBaseUrl,
      getPublicApiBaseUrl,
      getServerApiBaseUrl,
    } = await import(
      "./deployment-env"
    );

    expect(getAuthApiBaseUrl()).toBe("");
    expect(getPublicApiBaseUrl()).toBe("http://localhost:8080");
    expect(getServerApiBaseUrl()).toBe("http://localhost:8080");
  });

  it("서버 API 주소는 내부 주소가 있으면 우선 사용한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/");
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://backend.internal:8080/");

    const { getPublicApiBaseUrl, getServerApiBaseUrl } = await import(
      "./deployment-env"
    );

    expect(getPublicApiBaseUrl()).toBe("https://api.example.com");
    expect(getServerApiBaseUrl()).toBe("http://backend.internal:8080");
  });

  it("공유 인증 쿠키 도메인은 auth 전용 API 주소를 우선 사용한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8080");
    vi.stubEnv("NEXT_PUBLIC_AUTH_API_BASE_URL", "https://api.maum-on.parksuyeon.site");

    const { resolveSharedAuthCookieDomain } = await import("./deployment-env");

    expect(resolveSharedAuthCookieDomain("maum-on.parksuyeon.site")).toBe(
      ".maum-on.parksuyeon.site",
    );
  });

  it("설정된 쿠키 도메인이 api 호스트여도 프론트와 공유 가능한 상위 도메인으로 보정한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_COOKIE_DOMAIN", "api.maum-on.parksuyeon.site");

    const { resolveSharedAuthCookieDomain } = await import("./deployment-env");

    expect(resolveSharedAuthCookieDomain("www.maum-on.parksuyeon.site")).toBe(
      ".maum-on.parksuyeon.site",
    );
  });

  it("설정된 쿠키 도메인이 URL이어도 호스트를 파싱해 상위 도메인으로 보정한다", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_AUTH_COOKIE_DOMAIN",
      "https://api.maum-on.parksuyeon.site/",
    );

    const { resolveSharedAuthCookieDomain } = await import("./deployment-env");

    expect(resolveSharedAuthCookieDomain("www.maum-on.parksuyeon.site")).toBe(
      ".maum-on.parksuyeon.site",
    );
  });

  it("설정된 쿠키 도메인이 현재 프런트 호스트와 무관하면 공유 쿠키 도메인을 사용하지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_COOKIE_DOMAIN", ".maum-on.parksuyeon.site");

    const { resolveSharedAuthCookieDomain } = await import("./deployment-env");

    expect(resolveSharedAuthCookieDomain("preview-somehash.vercel.app")).toBeNull();
  });

  it("모니터링 프록시 기본 URL은 same-origin 경로를 사용한다", async () => {
    const { getMonitoringProxyBaseUrl } = await import("./deployment-env");

    expect(getMonitoringProxyBaseUrl()).toBe("");
  });

  it("운영에서도 공개 모니터링 경로 기본값은 same-origin을 유지한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.maum-on.parksuyeon.site");

    const { getMonitoringProxyBaseUrl, getMonitoringProxyInternalUrl } =
      await import("./deployment-env");

    expect(getMonitoringProxyBaseUrl()).toBe("");
    expect(getMonitoringProxyInternalUrl()).toBe(
      "https://monitor.maum-on.parksuyeon.site",
    );
  });

  it("절대 monitoring URL이 공개 env에 있으면 브라우저와 서버 모두 그 값을 사용한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_MONITORING_PROXY_URL",
      "https://monitor.maum-on.parksuyeon.site/",
    );

    const { getMonitoringProxyBaseUrl, getMonitoringProxyInternalUrl } =
      await import("./deployment-env");

    expect(getMonitoringProxyBaseUrl()).toBe(
      "https://monitor.maum-on.parksuyeon.site",
    );
    expect(getMonitoringProxyInternalUrl()).toBe(
      "https://monitor.maum-on.parksuyeon.site",
    );
  });

  it("경로 조합 유틸은 슬래시를 중복하지 않는다", async () => {
    const { joinBasePath, joinUrl } = await import("./deployment-env");

    expect(joinUrl("https://api.example.com/", "/api/v1/auth/me")).toBe(
      "https://api.example.com/api/v1/auth/me",
    );
    expect(joinBasePath("/monitoring/", "/grafana/")).toBe(
      "/monitoring/grafana/",
    );
  });

  it("웹소켓 origin은 http 스킴을 ws 스킴으로 변환한다", async () => {
    const { toWebSocketOrigin } = await import("./deployment-env");

    expect(toWebSocketOrigin("https://api.example.com/base")).toBe(
      "wss://api.example.com",
    );
    expect(toWebSocketOrigin("http://localhost:8080")).toBe(
      "ws://localhost:8080",
    );
  });
});
