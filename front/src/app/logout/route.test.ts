import { beforeEach, describe, expect, it, vi } from "vitest";

describe("logout route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("백엔드 로그아웃 쿠키를 프런트 도메인으로 재작성하고 로그인으로 리다이렉트한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.maum-on.parksuyeon.site");
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://127.0.0.1:8080");

    const upstreamHeaders = new Headers();
    upstreamHeaders.append(
      "set-cookie",
      "refreshToken=; Path=/; Domain=.maum-on.parksuyeon.site; Max-Age=0; HttpOnly; SameSite=Lax",
    );
    upstreamHeaders.append(
      "set-cookie",
      "maumOnAuthHint=; Path=/; Domain=.maum-on.parksuyeon.site; Max-Age=0; SameSite=Lax",
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: upstreamHeaders,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [{ POST }, { NextRequest }] = await Promise.all([
      import("./route"),
      import("next/server"),
    ]);

    const request = new NextRequest("https://www.maum-on.parksuyeon.site/logout", {
      method: "POST",
      headers: new Headers({
        host: "www.maum-on.parksuyeon.site",
        cookie: "refreshToken=raw-refresh-token; maumOnAuthHint=member",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.maum-on.parksuyeon.site/login");
    expect(response.headers.getSetCookie()).toEqual([
      "refreshToken=; Path=/; Max-Age=0; Domain=.maum-on.parksuyeon.site; HttpOnly; SameSite=lax",
      "maumOnAuthHint=; Path=/; Max-Age=0; Domain=.maum-on.parksuyeon.site; SameSite=lax",
    ]);

    const forwardedHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get("cookie")).toBe(
      "refreshToken=raw-refresh-token; maumOnAuthHint=member",
    );
  });
});
