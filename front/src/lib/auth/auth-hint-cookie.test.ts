import { describe, expect, it } from "vitest";
import { parseAuthHintCookieValue } from "@/lib/auth/auth-hint-cookie";

describe("auth-hint-cookie", () => {
  it("admin 쿠키 값은 관리자 인증 상태로 해석한다", () => {
    expect(parseAuthHintCookieValue("admin")).toEqual({
      isAuthenticated: true,
      isAdmin: true,
    });
  });

  it("member 쿠키 값은 일반 회원 인증 상태로 해석한다", () => {
    expect(parseAuthHintCookieValue("member")).toEqual({
      isAuthenticated: true,
      isAdmin: false,
    });
  });

  it("알 수 없는 값은 비인증 상태로 해석한다", () => {
    expect(parseAuthHintCookieValue(undefined)).toEqual({
      isAuthenticated: false,
      isAdmin: false,
    });
    expect(parseAuthHintCookieValue("unknown")).toEqual({
      isAuthenticated: false,
      isAdmin: false,
    });
  });
});
