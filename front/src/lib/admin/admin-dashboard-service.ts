import { requestData } from "@/lib/api/http-client";
import type {
  AdminDashboardStats,
  GrafanaSessionState,
} from "@/lib/admin/admin-dashboard-types";
import { getGrafanaSessionProbeUrl } from "@/lib/admin/grafana-dashboard";

const ADMIN_DASHBOARD_STATS_PATH = "/api/v1/admin/dashboard/stats";

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return requestData<AdminDashboardStats>(ADMIN_DASHBOARD_STATS_PATH);
}

export async function getGrafanaSessionState(): Promise<GrafanaSessionState> {
  try {
    const response = await fetch(getGrafanaSessionProbeUrl(), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (response.ok && contentType.includes("application/json")) {
      return "ready";
    }

    if (response.status === 401 || response.status === 403) {
      return "login-required";
    }

    if (
      response.redirected ||
      response.url.includes("/grafana/login") ||
      contentType.includes("text/html")
    ) {
      return "login-required";
    }

    return "unavailable";
  } catch {
    return "unavailable";
  }
}
