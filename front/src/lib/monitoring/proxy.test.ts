import { beforeEach, describe, expect, it, vi } from "vitest";

describe("monitoring proxy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("decoded monitoring response를 브라우저로 넘길 때 압축 헤더를 제거한다", async () => {
    vi.stubEnv("MONITORING_PROXY_INTERNAL_URL", "https://monitor.maum-on.parksuyeon.site");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"login":"admin"}', {
        status: 200,
        headers: new Headers({
          "content-type": "application/json",
          "content-encoding": "gzip",
          "content-length": "999",
          "transfer-encoding": "chunked",
        }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [{ proxyMonitoringRequest }, { NextRequest }] = await Promise.all([
      import("./proxy"),
      import("next/server"),
    ]);

    const request = new NextRequest("https://www.maum-on.parksuyeon.site/grafana/api/user", {
      headers: new Headers({
        cookie: "maumOnAuthHint=admin",
      }),
    });

    const response = await proxyMonitoringRequest(request, "/grafana");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const forwardedOptions = fetchMock.mock.calls[0]?.[1];
    const forwardedHeaders = forwardedOptions?.headers as Headers;
    expect(forwardedHeaders.get("x-webauth-user")).toBe("maum-on-admin");
    expect(forwardedHeaders.get("accept-encoding")).toBe("identity");

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("transfer-encoding")).toBeNull();
    expect(response.headers.get("x-maum-on-monitoring-proxy")).toBe("/grafana");
    await expect(response.text()).resolves.toBe('{"login":"admin"}');
  });
});
