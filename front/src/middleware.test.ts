import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function createJsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

describe("middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("BACKEND_INTERNAL_URL", "https://api.maum-on.parksuyeon.site");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.maum-on.parksuyeon.site");
  });

  it("관리자 경로 접근 시 refresh 회전 대신 session 검증 API를 GET으로 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-7",
        msg: "Session validated successfully.",
        data: {
          accessToken: "session-access-token",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          member: {
            id: 503,
            email: "admin@test.com",
            nickname: "관리자",
            role: "ADMIN",
            status: "ACTIVE",
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { middleware } = await import("../middleware");
    const request = new NextRequest("https://www.maum-on.parksuyeon.site/admin", {
      headers: {
        host: "www.maum-on.parksuyeon.site",
        cookie:
          "refreshToken=current-refresh-token; maumOnAuthHint=admin",
      },
    });

    const response = await middleware(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      "https://api.maum-on.parksuyeon.site/api/v1/auth/session",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      cache: "no-store",
    });
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("cookie"),
    ).toBe("refreshToken=current-refresh-token; maumOnAuthHint=admin");

    expect(response.status).toBe(200);
    expect(
      response.headers.get("x-middleware-request-x-maum-on-server-auth"),
    ).toBe("admin");
  });

  it("관리자 경로 검증 응답에 refresh Set-Cookie가 있어도 브라우저로 재전달하지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          resultCode: "200-7",
          msg: "Session validated successfully.",
          data: {
            accessToken: "session-access-token",
            tokenType: "Bearer",
            expiresInSeconds: 3600,
            member: {
              id: 503,
              email: "admin@test.com",
              nickname: "관리자",
              role: "ADMIN",
              status: "ACTIVE",
            },
          },
        },
        200,
        {
          "set-cookie":
            "refreshToken=next-refresh-token; Path=/; Domain=.maum-on.parksuyeon.site; HttpOnly; Secure; SameSite=None",
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { middleware } = await import("../middleware");
    const request = new NextRequest("https://www.maum-on.parksuyeon.site/admin", {
      headers: {
        host: "www.maum-on.parksuyeon.site",
        cookie:
          "refreshToken=current-refresh-token; maumOnAuthHint=admin",
      },
    });

    const response = await middleware(request);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("maumOnAuthHint=admin");
    expect(setCookie).not.toContain("refreshToken=");
  });
});
