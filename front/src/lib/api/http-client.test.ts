import { beforeEach, describe, expect, it, vi } from "vitest";

const member = {
  id: 1,
  email: "user@example.com",
  nickname: "tester",
  role: "USER",
  status: "ACTIVE",
};

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("http-client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("성공 응답이면 RsData의 data를 그대로 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "성공",
        data: { value: 1 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { requestData } = await import("./http-client");

    await expect(requestData<{ value: number }>("/api/v1/sample")).resolves.toEqual({
      value: 1,
    });
  });

  it("보호 요청이 401이면 refresh 후 한 번 재시도한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            resultCode: "401-1",
            msg: "인증이 필요합니다.",
            data: null,
          },
          401,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          resultCode: "200-1",
          msg: "재발급 성공",
          data: {
            accessToken: "refreshed-access-token",
            tokenType: "Bearer",
            expiresInSeconds: 3600,
            member,
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          resultCode: "200-1",
          msg: "성공",
          data: { value: 7 },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const tokenStore = await import("@/lib/auth/token-store");
    tokenStore.setAccessToken("expired-access-token");

    const { requestData } = await import("./http-client");

    await expect(requestData<{ value: number }>("/api/v1/protected")).resolves.toEqual({
      value: 7,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const firstHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    const retriedHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers);

    expect(firstHeaders.get("Authorization")).toBe("Bearer expired-access-token");
    expect(retriedHeaders.get("Authorization")).toBe("Bearer refreshed-access-token");
  });
});
