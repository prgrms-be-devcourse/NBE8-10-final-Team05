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
      sessionRevision: 1,
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
      sessionRevision: 2,
    });
  });

  it("같은 회원의 토큰 갱신이나 me 재조회는 sessionRevision을 증가시키지 않는다", async () => {
    const { authStore } = await loadAuthModules();

    authStore.applyAuthTokenPayload({
      accessToken: "access-token-1",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      member,
    });
    const firstRevision = authStore.getAuthState().sessionRevision;

    authStore.applyAuthTokenPayload({
      accessToken: "access-token-2",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      member,
    });
    authStore.applyAuthenticatedMember(member);

    expect(authStore.getAuthState().sessionRevision).toBe(firstRevision);
  });

  it("다른 회원으로 인증되면 sessionRevision이 증가한다", async () => {
    const { authStore } = await loadAuthModules();

    authStore.applyAuthTokenPayload({
      accessToken: "access-token-1",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      member,
    });
    const firstRevision = authStore.getAuthState().sessionRevision;

    authStore.clearAuthSession();
    authStore.applyAuthTokenPayload({
      accessToken: "access-token-2",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      member: {
        ...member,
        id: 2,
        email: "user2@example.com",
        nickname: "tester2",
      },
    });

    expect(authStore.getAuthState().sessionRevision).toBeGreaterThan(firstRevision);
    expect(authStore.getAuthState().member?.id).toBe(2);
  });

  it("이미 비로그인 상태에서 clearAuthSession을 호출하면 sessionRevision은 유지된다", async () => {
    const { authStore } = await loadAuthModules();

    expect(authStore.getAuthState().sessionRevision).toBe(0);
    authStore.clearAuthSession();
    expect(authStore.getAuthState().sessionRevision).toBe(0);
  });
});
