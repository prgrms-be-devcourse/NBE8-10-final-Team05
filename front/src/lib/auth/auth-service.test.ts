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
    vi.unstubAllEnvs();
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

  it("OIDC 로그인은 same-origin auth 프록시 authorize 엔드포인트를 사용한다", async () => {
    const assign = vi.fn();
    vi.stubGlobal(
      "window",
      {
        location: {
          origin: "https://maum-on.parksuyeon.site",
          assign,
        },
      } as unknown as Window,
    );

    const authService = await import("./auth-service");

    authService.startOidcLogin("maum-on-oidc", "/letters/mailbox");

    const authorizeUrl = new URL(assign.mock.calls[0][0]);
    expect(authorizeUrl.origin).toBe("https://maum-on.parksuyeon.site");
    expect(authorizeUrl.pathname).toBe("/api/v1/auth/oidc/authorize/maum-on-oidc");
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe("https://maum-on.parksuyeon.site/letters/mailbox");
  });

  it.each([
    ["maum-on-oidc", "/api/v1/auth/oidc/authorize/maum-on-oidc"],
    ["kakao", "/api/v1/auth/oidc/authorize/kakao"],
  ] as const)(
    "%s OIDC 팝업 로그인은 callback 페이지를 redirect_uri로 사용한다",
    async (provider, expectedPathname) => {
    const popupWindow = {
      focus: vi.fn(),
    };
    const open = vi.fn().mockReturnValue(popupWindow);
    const assign = vi.fn();
    vi.stubGlobal(
      "window",
      {
        screenX: 120,
        screenY: 80,
        outerWidth: 1440,
        outerHeight: 960,
        open,
        location: {
          origin: "https://maum-on.parksuyeon.site",
          assign,
        },
      } as unknown as Window,
    );

    const authService = await import("./auth-service");

    const result = authService.startOidcLogin(provider, "/letters/mailbox", {
      popup: true,
    });

    expect(result).toBe(popupWindow);
    expect(open).toHaveBeenCalledTimes(1);
    expect(popupWindow.focus).toHaveBeenCalledTimes(1);

    const authorizeUrl = new URL(open.mock.calls[0][0]);
    const redirectUrl = new URL(authorizeUrl.searchParams.get("redirect_uri")!);
    expect(authorizeUrl.pathname).toBe(expectedPathname);
    expect(redirectUrl.origin).toBe("https://maum-on.parksuyeon.site");
    expect(redirectUrl.pathname).toBe("/login/callback");
    expect(redirectUrl.searchParams.get("mode")).toBe("popup");
    expect(redirectUrl.searchParams.get("next")).toBe("/letters/mailbox");
    expect(assign).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["maum-on-oidc", "/api/v1/auth/oidc/authorize/maum-on-oidc"],
    ["kakao", "/api/v1/auth/oidc/authorize/kakao"],
  ] as const)(
    "%s OIDC 팝업이 차단되면 direct redirect 흐름으로 폴백한다",
    async (provider, expectedPathname) => {
    const open = vi.fn().mockReturnValue(null);
    const assign = vi.fn();
    vi.stubGlobal(
      "window",
      {
        screenX: 0,
        screenY: 0,
        outerWidth: 1280,
        outerHeight: 900,
        open,
        location: {
          origin: "https://maum-on.parksuyeon.site",
          assign,
        },
      } as unknown as Window,
    );

    const authService = await import("./auth-service");

    authService.startOidcLogin(provider, "/letters/mailbox", {
      popup: true,
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);

    const authorizeUrl = new URL(assign.mock.calls[0][0]);
    expect(authorizeUrl.pathname).toBe(expectedPathname);
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(
      "https://maum-on.parksuyeon.site/letters/mailbox",
    );
    },
  );

  it("OIDC 팝업 메시지는 부모 창에서 판별 가능한 형식으로 생성된다", async () => {
    const authService = await import("./auth-service");
    const message = authService.createOidcPopupMessage(
      "error",
      "invalid-path",
      "로그인 실패",
    );

    expect(authService.isOidcPopupMessage(message)).toBe(true);
    expect(message).toMatchObject({
      status: "error",
      nextPath: "/dashboard",
      errorMessage: "로그인 실패",
    });
    expect(authService.isOidcPopupMessage({ type: "other" })).toBe(false);
  });
});
