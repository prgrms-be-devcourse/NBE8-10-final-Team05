import { beforeEach, describe, expect, it, vi } from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("home-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("홈 통계 조회는 RsData의 data를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "홈 통계를 조회했습니다.",
        data: {
          todayWorryCount: 12,
          todayLetterCount: 7,
          todayDiaryCount: 3,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getHomeStats } = await import("./home-service");

    await expect(getHomeStats()).resolves.toEqual({
      todayWorryCount: 12,
      todayLetterCount: 7,
      todayDiaryCount: 3,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/home/stats",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });
});
