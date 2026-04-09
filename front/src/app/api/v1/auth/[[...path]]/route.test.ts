import { beforeEach, describe, expect, it, vi } from "vitest";

describe("auth route proxy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("원본 host 헤더 기준으로 refresh 쿠키를 재작성한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.maum-on.parksuyeon.site");
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://127.0.0.1:8080");

    const upstreamHeaders = new Headers({
      "content-type": "application/json",
    });
    upstreamHeaders.append(
      "set-cookie",
      "refreshToken=abc; Path=/; HttpOnly; SameSite=Lax",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            resultCode: "200-3",
            msg: "Logged in successfully.",
            data: { accessToken: "token" },
          }),
          {
            status: 200,
            headers: upstreamHeaders,
          },
        ),
      ),
    );

    const [{ POST }, { NextRequest }] = await Promise.all([
      import("./route"),
      import("next/server"),
    ]);

    const request = new NextRequest("http://localhost:3100/api/v1/auth/login", {
      method: "POST",
      headers: new Headers({
        host: "maum-on.parksuyeon.site:3100",
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        email: "probe3@example.com",
        password: "pass1234",
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({
        path: ["login"],
      }),
    });

    expect(response.headers.getSetCookie()).toEqual([
      "refreshToken=abc; Path=/; HttpOnly; SameSite=Lax; Domain=.maum-on.parksuyeon.site",
      "refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
    ]);
  });

  it("x-forwarded-host가 다른 값이어도 실제 요청 host 기준으로 쿠키 도메인을 계산한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_COOKIE_DOMAIN", ".maum-on.parksuyeon.site");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.maum-on.parksuyeon.site");
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://127.0.0.1:8080");

    const upstreamHeaders = new Headers({
      "content-type": "application/json",
    });
    upstreamHeaders.append(
      "set-cookie",
      "refreshToken=abc; Path=/; Domain=.maum-on.parksuyeon.site; HttpOnly; SameSite=Lax",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            resultCode: "200-3",
            msg: "Logged in successfully.",
            data: { accessToken: "token" },
          }),
          {
            status: 200,
            headers: upstreamHeaders,
          },
        ),
      ),
    );

    const [{ POST }, { NextRequest }] = await Promise.all([
      import("./route"),
      import("next/server"),
    ]);

    const request = new NextRequest("https://preview-somehash.vercel.app/api/v1/auth/login", {
      method: "POST",
      headers: new Headers({
        host: "preview-somehash.vercel.app",
        "x-forwarded-host": "api.maum-on.parksuyeon.site",
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        email: "probe3@example.com",
        password: "pass1234",
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({
        path: ["login"],
      }),
    });

    expect(response.headers.getSetCookie()).toEqual([
      "refreshToken=abc; Path=/; HttpOnly; SameSite=Lax",
    ]);
  });

  it("refresh 요청에 중복 refreshToken 쿠키가 있으면 최신 토큰 하나만 백엔드로 전달한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.maum-on.parksuyeon.site");
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://127.0.0.1:8080");

    const olderRefreshToken = `header.${Buffer.from(
      JSON.stringify({ iat: 100, exp: 200 }),
    ).toString("base64url")}.signature`;
    const newerRefreshToken = `header.${Buffer.from(
      JSON.stringify({ iat: 300, exp: 400 }),
    ).toString("base64url")}.signature`;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          resultCode: "200-4",
          msg: "Refreshed.",
          data: { accessToken: "token" },
        }),
        {
          status: 200,
          headers: new Headers({
            "content-type": "application/json",
          }),
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [{ POST }, { NextRequest }] = await Promise.all([
      import("./route"),
      import("next/server"),
    ]);

    const request = new NextRequest("http://localhost:3100/api/v1/auth/refresh", {
      method: "POST",
      headers: new Headers({
        host: "www.maum-on.parksuyeon.site",
        cookie: `refreshToken=${olderRefreshToken}; JSESSIONID=abc; refreshToken=${newerRefreshToken}`,
      }),
    });

    await POST(request, {
      params: Promise.resolve({
        path: ["refresh"],
      }),
    });

    const forwardedHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get("cookie")).toBe(
      `refreshToken=${newerRefreshToken}; JSESSIONID=abc`,
    );
  });
});
