import { requestData } from "@/lib/api/http-client";
import type {
  AdminDashboardStats,
  GrafanaSessionState,
} from "@/lib/admin/admin-dashboard-types";
import {
  getGrafanaSessionProbeUrl,
  usesCrossOriginMonitoringEmbed,
} from "@/lib/admin/grafana-dashboard";

const ADMIN_DASHBOARD_STATS_PATH = "/api/v1/admin/dashboard/stats";
const MONITORING_STATUS_HEADER = "x-maum-on-monitoring-status";
const MONITORING_STATUS_DISABLED = "disabled";

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return requestData<AdminDashboardStats>(ADMIN_DASHBOARD_STATS_PATH);
}

export async function getGrafanaSessionState(): Promise<GrafanaSessionState> {
  if (usesCrossOriginMonitoringEmbed()) {
    return "ready";
  }

  try {
    const response = await fetch(getGrafanaSessionProbeUrl(), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const monitoringStatus = response.headers.get(MONITORING_STATUS_HEADER);

    if (monitoringStatus === MONITORING_STATUS_DISABLED) {
      return "disabled";
    }

    if (response.ok && contentType.includes("application/json")) {
      return "ready";
    }

    if (response.status === 401 || response.status === 403) {
      return "login-required";
    }

    if (
      response.redirected ||
      response.url.includes("/login") ||
      response.url.includes("/grafana/login") ||
      (response.ok && contentType.includes("text/html"))
    ) {
      return "login-required";
    }

    if (!response.ok) {
      return "unavailable";
    }

    return "unavailable";
  } catch {
    return "unavailable";
  }
}
