import { describe, expect, it } from "vitest";
import {
  buildGrafanaPanelUrl,
  getGrafanaHomeUrl,
  getMonitoringProxyBaseUrl,
  getPrometheusHomeUrl,
} from "./grafana-dashboard";

describe("grafana-dashboard", () => {
  it("모니터링 프록시 기본 URL은 localhost:3400을 사용한다", () => {
    expect(getMonitoringProxyBaseUrl()).toBe("http://localhost:3400");
  });

  it("Grafana 홈 URL은 grafana 서브패스를 사용한다", () => {
    expect(getGrafanaHomeUrl()).toBe("http://localhost:3400/grafana/");
  });

  it("Prometheus 홈 URL은 prometheus 서브패스를 사용한다", () => {
    expect(getPrometheusHomeUrl()).toBe("http://localhost:3400/prometheus/");
  });

  it("패널 iframe URL은 d-solo 경로와 panelId를 포함한다", () => {
    const url = buildGrafanaPanelUrl(3);

    expect(url).toContain("/grafana/d-solo/maum-on-local-observability/maum-on-local-observability");
    expect(url).toContain("panelId=3");
    expect(url).toContain("theme=light");
    expect(url).toContain("refresh=30s");
  });
});
