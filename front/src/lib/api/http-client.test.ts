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
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com");
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
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/auth/refresh");

    const firstHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    const retriedHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers);

    expect(firstHeaders.get("Authorization")).toBe("Bearer expired-access-token");
    expect(retriedHeaders.get("Authorization")).toBe("Bearer refreshed-access-token");
  });

  it("403 응답이면 권한 부족 이벤트를 한 번 발행한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          resultCode: "403-1",
          msg: "You do not have permission.",
          data: null,
        },
        403,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const onAuthorizationFailure = vi.fn();
    const { configureHttpClient, requestData } = await import("./http-client");

    configureHttpClient({ onAuthorizationFailure });

    await expect(requestData("/api/v1/protected")).rejects.toThrow(
      "You do not have permission.",
    );

    expect(onAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(onAuthorizationFailure).toHaveBeenCalledWith({
      status: 403,
      resultCode: "403-1",
    });
  });

  it("인증 API는 AUTH_API_BASE_URL이 있어도 항상 프런트 auth 프록시 경로를 사용한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_API_BASE_URL", "https://auth.example.com");
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-3",
        msg: "로그인 성공",
        data: {
          accessToken: "access-token",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          member,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { requestData } = await import("./http-client");

    await requestData("/api/v1/auth/login", {
      method: "POST",
      skipAuth: true,
      retryOnAuthFailure: false,
      authFailureRedirect: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/auth/login");
  });
});
