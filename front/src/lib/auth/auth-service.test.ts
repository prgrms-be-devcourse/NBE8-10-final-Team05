import { beforeEach, describe, expect, it, vi } from "vitest";

const member = {
  id: 99,
  email: "admin@admin.com",
  nickname: "관리자",
  role: "ADMIN",
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("auth-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("로그인 성공 시 복원 상태를 즉시 종료한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "로그인 성공",
        data: {
          accessToken: "login-token",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          member,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const authService = await import("./auth-service");
    const authStore = await import("./auth-store");

    authStore.setRestoring(true);
    await authService.login({ email: member.email, password: "admin" });

    expect(authStore.getAuthState()).toMatchObject({
      isAuthenticated: true,
      hasRestored: true,
      isRestoring: false,
      member,
    });
  });

  it("오래된 복원 실패가 로그인 성공 뒤 세션을 지우지 않는다", async () => {
    const refreshDeferred = createDeferred<Response>();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => refreshDeferred.promise)
      .mockResolvedValueOnce(
        createJsonResponse({
          resultCode: "200-1",
          msg: "로그인 성공",
          data: {
            accessToken: "login-token",
            tokenType: "Bearer",
            expiresInSeconds: 3600,
            member,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const authService = await import("./auth-service");
    const authStore = await import("./auth-store");

    const restorePromise = authService.restoreSession();
    await Promise.resolve();

    await authService.login({ email: member.email, password: "admin" });

    refreshDeferred.resolve(
      createJsonResponse(
        {
          resultCode: "401-3",
          msg: "Refresh token cookie is required.",
          data: null,
        },
        401,
      ),
    );

    await restorePromise;

    expect(authStore.getAuthState()).toMatchObject({
      isAuthenticated: true,
      hasRestored: true,
      isRestoring: false,
      member,
    });
  });

  it("OIDC 콜백 복원은 hasRestored 이후에도 강제로 refresh를 재시도한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-2",
        msg: "세션 복원 성공",
        data: {
          accessToken: "restored-token",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          member,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const authService = await import("./auth-service");
    const authStore = await import("./auth-store");

    authStore.markRestoreFinished();

    await authService.restoreSession({ force: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authStore.getAuthState()).toMatchObject({
      isAuthenticated: true,
      hasRestored: true,
      isRestoring: false,
      member,
    });
  });
});
