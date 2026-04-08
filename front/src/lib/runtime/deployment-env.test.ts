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

  it("모니터링 프록시 기본 URL은 same-origin 경로를 사용한다", async () => {
    const { getMonitoringProxyBaseUrl } = await import("./deployment-env");

    expect(getMonitoringProxyBaseUrl()).toBe("");
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
