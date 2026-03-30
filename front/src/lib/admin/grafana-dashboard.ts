export interface GrafanaPanelDefinition {
  panelId: number;
  title: string;
  description: string;
  height: number;
}

const DEFAULT_MONITORING_PROXY_URL = "http://localhost:3400";
const DASHBOARD_UID = "maum-on-local-observability";
const DASHBOARD_SLUG = "maum-on-local-observability";

export const GRAFANA_PANEL_DEFINITIONS: GrafanaPanelDefinition[] = [
  {
    panelId: 1,
    title: "총 HTTP 요청 수",
    description: "최근 구간 동안 누적된 API 요청량입니다.",
    height: 320,
  },
  {
    panelId: 2,
    title: "HTTP p95 응답 시간",
    description: "지연이 커지는 구간을 빠르게 확인합니다.",
    height: 320,
  },
  {
    panelId: 3,
    title: "JVM Heap 사용량",
    description: "메모리 압박이 생기는지 모니터링합니다.",
    height: 320,
  },
  {
    panelId: 4,
    title: "Hikari 활성 커넥션",
    description: "DB 커넥션 풀이 과하게 점유되는지 확인합니다.",
    height: 320,
  },
];

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getMonitoringProxyBaseUrl(): string {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_MONITORING_PROXY_URL ?? DEFAULT_MONITORING_PROXY_URL;

  return trimTrailingSlash(rawBaseUrl);
}

export function buildGrafanaPanelUrl(panelId: number): string {
  const params = new URLSearchParams({
    orgId: "1",
    panelId: String(panelId),
    from: "now-6h",
    to: "now",
    theme: "light",
    refresh: "30s",
  });

  return `${getMonitoringProxyBaseUrl()}/grafana/d-solo/${DASHBOARD_UID}/${DASHBOARD_SLUG}?${params.toString()}`;
}

export function getGrafanaHomeUrl(): string {
  return `${getMonitoringProxyBaseUrl()}/grafana/`;
}

export function getPrometheusHomeUrl(): string {
  return `${getMonitoringProxyBaseUrl()}/prometheus/`;
}
