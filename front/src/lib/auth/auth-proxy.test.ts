import { describe, expect, it } from "vitest";
import {
  applyForwardedHeaders,
  buildSetCookieHeadersForFrontend,
  extractCookieNameFromSetCookie,
  extractSetCookieHeaders,
  isAuthApiPath,
  resolveRequestHostname,
  rewriteSetCookieForFrontend,
} from "./auth-proxy";

describe("auth-proxy", () => {
  it("auth API 경로를 식별한다", () => {
    expect(isAuthApiPath("/api/v1/auth/login")).toBe(true);
    expect(isAuthApiPath("/api/v1/posts")).toBe(false);
  });

  it("공유 상위 도메인이 있으면 Set-Cookie Domain을 그 값으로 맞춘다", () => {
    const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.maum-on.parksuyeon.site";

    expect(
      rewriteSetCookieForFrontend(
        "refreshToken=abc; Path=/; Domain=api.example.com; HttpOnly; Secure; SameSite=None",
        { requestHostname: "maum-on.parksuyeon.site" },
      ),
    ).toBe(
      "refreshToken=abc; Path=/; HttpOnly; Secure; SameSite=None; Domain=.maum-on.parksuyeon.site",
    );

    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  it("공유 상위 도메인을 계산할 수 없으면 Set-Cookie Domain을 제거한다", () => {
    const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.maum-on.parksuyeon.site";

    expect(
      rewriteSetCookieForFrontend(
        "refreshToken=abc; Path=/; Domain=api.example.com; HttpOnly; Secure; SameSite=None",
        { requestHostname: "localhost" },
      ),
    ).toBe("refreshToken=abc; Path=/; HttpOnly; Secure; SameSite=None");

    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  it("공유 도메인을 사용할 때 이전 host-only 쿠키 만료 헤더를 함께 만든다", () => {
    const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.maum-on.parksuyeon.site";

    expect(
      buildSetCookieHeadersForFrontend(
        "refreshToken=abc; Path=/; Domain=api.example.com; HttpOnly; Secure; SameSite=None",
        { requestHostname: "maum-on.parksuyeon.site" },
      ),
    ).toEqual([
      "refreshToken=abc; Path=/; HttpOnly; Secure; SameSite=None; Domain=.maum-on.parksuyeon.site",
      "refreshToken=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None",
    ]);

    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  it("auth 전용 API 주소가 있으면 그 호스트 기준으로 공유 도메인을 계산한다", () => {
    const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const originalAuthApiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8080";
    process.env.NEXT_PUBLIC_AUTH_API_BASE_URL = "https://api.maum-on.parksuyeon.site";

    expect(
      buildSetCookieHeadersForFrontend(
        "refreshToken=abc; Path=/; HttpOnly; SameSite=Lax",
        { requestHostname: "maum-on.parksuyeon.site" },
      ),
    ).toEqual([
      "refreshToken=abc; Path=/; HttpOnly; SameSite=Lax; Domain=.maum-on.parksuyeon.site",
      "refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
    ]);

    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    process.env.NEXT_PUBLIC_AUTH_API_BASE_URL = originalAuthApiBaseUrl;
  });

  it("복수 Set-Cookie 헤더를 분리한다", () => {
    const headers = new Headers();
    headers.set(
      "set-cookie",
      "refreshToken=abc; Path=/; HttpOnly, maumOnAuthHint=member; Path=/; SameSite=Lax",
    );

    expect(extractSetCookieHeaders(headers)).toEqual([
      "refreshToken=abc; Path=/; HttpOnly",
      "maumOnAuthHint=member; Path=/; SameSite=Lax",
    ]);
    expect(extractCookieNameFromSetCookie("refreshToken=abc; Path=/")).toBe(
      "refreshToken",
    );
  });

  it("프론트 요청 URL 기준 forwarded 헤더를 설정한다", () => {
    const headers = new Headers();

    applyForwardedHeaders(
      headers,
      new URL("https://preview.example.com:3100/api/v1/auth/login"),
    );

    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("x-forwarded-host")).toBe("preview.example.com:3100");
    expect(headers.get("x-forwarded-port")).toBe("3100");
  });

  it("원본 요청 host 헤더를 우선 사용해 호스트명을 계산한다", () => {
    const headers = new Headers({
      host: "maum-on.parksuyeon.site:3100",
    });

    expect(
      resolveRequestHostname({
        headers,
        nextUrl: new URL("http://localhost:3100/api/v1/auth/login"),
      }),
    ).toBe("maum-on.parksuyeon.site");
  });
});
