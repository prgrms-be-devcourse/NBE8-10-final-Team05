import { beforeEach, describe, expect, it, vi } from "vitest";

const member = {
  id: 1,
  email: "user@example.com",
  nickname: "tester",
  role: "USER",
  status: "ACTIVE",
};

async function loadAuthModules() {
  const authStore = await import("./auth-store");
  const tokenStore = await import("./token-store");

  return { authStore, tokenStore };
}

describe("auth-store", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("토큰 페이로드를 반영하면 인증 상태와 access 토큰이 갱신된다", async () => {
    const { authStore, tokenStore } = await loadAuthModules();

    authStore.applyAuthTokenPayload({
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      member,
    });

    expect(tokenStore.getAccessToken()).toBe("access-token");
    expect(authStore.getAuthState()).toMatchObject({
      member,
      isAuthenticated: true,
      errorMessage: null,
    });
  });

  it("세션을 비우면 회원 정보와 access 토큰이 제거된다", async () => {
    const { authStore, tokenStore } = await loadAuthModules();

    authStore.applyAuthTokenPayload({
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      member,
    });
    authStore.clearAuthSession();

    expect(tokenStore.getAccessToken()).toBeNull();
    expect(authStore.getAuthState()).toMatchObject({
      member: null,
      isAuthenticated: false,
    });
  });
});
