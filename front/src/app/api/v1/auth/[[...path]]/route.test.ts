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
});
