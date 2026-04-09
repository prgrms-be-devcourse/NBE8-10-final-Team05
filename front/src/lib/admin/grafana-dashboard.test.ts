import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGrafanaPanelUrl,
  getGrafanaHomeUrl,
  getGrafanaSessionProbeUrl,
  getK6GrafanaDashboardUrl,
  getMonitoringProxyBaseUrl,
  getPrometheusHomeUrl,
} from "./grafana-dashboard";

describe("grafana-dashboard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("모니터링 프록시 기본 URL은 same-origin 경로를 사용한다", () => {
    expect(getMonitoringProxyBaseUrl()).toBe("");
  });

  it("Grafana 홈 URL은 grafana 서브패스를 사용한다", () => {
    expect(getGrafanaHomeUrl()).toBe("/grafana/");
  });

  it("Prometheus 홈 URL은 prometheus 서브패스를 사용한다", () => {
    expect(getPrometheusHomeUrl()).toBe("/prometheus/");
    expect(getGrafanaSessionProbeUrl()).toBe("/grafana/api/user");
  });

  it("k6 대시보드 URL은 Grafana 대시보드 경로를 사용한다", () => {
    expect(getK6GrafanaDashboardUrl()).toBe(
      "/grafana/d/maum-on-k6-load-test/maum-on-k6-load-test",
    );
  });

  it("패널 iframe URL은 d-solo 경로와 panelId를 포함한다", () => {
    const url = buildGrafanaPanelUrl(3);

    expect(url).toContain("/grafana/d-solo/maum-on-local-observability/maum-on-local-observability");
    expect(url).toContain("panelId=3");
    expect(url).toContain("theme=light");
    expect(url).toContain("refresh=60s");
  });

  it("운영에서는 Grafana 링크를 monitor ingress로 직접 연다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.maum-on.parksuyeon.site");

    const {
      getGrafanaHomeUrl: getHomeUrl,
      getGrafanaSessionProbeUrl: getProbeUrl,
      getMonitoringProxyBaseUrl: getBaseUrl,
      usesCrossOriginMonitoringEmbed: usesCrossOriginEmbed,
    } = await import("./grafana-dashboard");

    expect(getBaseUrl()).toBe("https://monitor.maum-on.parksuyeon.site");
    expect(getHomeUrl()).toBe("https://monitor.maum-on.parksuyeon.site/grafana/");
    expect(getProbeUrl()).toBe("/grafana/api/user");
    expect(usesCrossOriginEmbed()).toBe(true);
  });
});
