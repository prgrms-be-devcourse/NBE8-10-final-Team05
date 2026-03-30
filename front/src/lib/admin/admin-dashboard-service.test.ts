import { beforeEach, describe, expect, it, vi } from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("admin-dashboard-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("관리자 대시보드 통계는 RsData의 data를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "관리자 대시보드 통계를 조회했습니다.",
        data: {
          todayReportsCount: 3,
          pendingReportsCount: 4,
          processedReportsCount: 5,
          todayLettersCount: 6,
          todayDiariesCount: 7,
          availableReceiversCount: 8,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAdminDashboardStats } = await import("./admin-dashboard-service");

    await expect(getAdminDashboardStats()).resolves.toEqual({
      todayReportsCount: 3,
      pendingReportsCount: 4,
      processedReportsCount: 5,
      todayLettersCount: 6,
      todayDiariesCount: 7,
      availableReceiversCount: 8,
    });
  });

  it("Grafana 세션이 준비되면 ready를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        id: 1,
        login: "admin",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getGrafanaSessionState } = await import("./admin-dashboard-service");

    await expect(getGrafanaSessionState()).resolves.toBe("ready");
  });

  it("Grafana 로그인 HTML이 반환되면 login-required를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html><title>Grafana</title></html>", {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getGrafanaSessionState } = await import("./admin-dashboard-service");

    await expect(getGrafanaSessionState()).resolves.toBe("login-required");
  });

  it("Grafana 프록시 연결이 실패하면 unavailable을 반환한다", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const { getGrafanaSessionState } = await import("./admin-dashboard-service");

    await expect(getGrafanaSessionState()).resolves.toBe("unavailable");
  });
});
