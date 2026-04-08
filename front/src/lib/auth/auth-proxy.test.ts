import { describe, expect, it } from "vitest";
import {
  applyForwardedHeaders,
  extractCookieNameFromSetCookie,
  extractSetCookieHeaders,
  isAuthApiPath,
  rewriteSetCookieForFrontend,
} from "./auth-proxy";

describe("auth-proxy", () => {
  it("auth API 경로를 식별한다", () => {
    expect(isAuthApiPath("/api/v1/auth/login")).toBe(true);
    expect(isAuthApiPath("/api/v1/posts")).toBe(false);
  });

  it("Set-Cookie에서 Domain 속성을 제거한다", () => {
    expect(
      rewriteSetCookieForFrontend(
        "refreshToken=abc; Path=/; Domain=api.example.com; HttpOnly; Secure; SameSite=None",
      ),
    ).toBe("refreshToken=abc; Path=/; HttpOnly; Secure; SameSite=None");
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
});
