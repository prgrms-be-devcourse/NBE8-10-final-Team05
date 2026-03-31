export interface AdminDashboardStats {
  todayReportsCount: number;
  pendingReportsCount: number;
  processedReportsCount: number;
  todayLettersCount: number;
  todayDiariesCount: number;
  availableReceiversCount: number;
}

export type GrafanaSessionState =
  | "checking"
  | "ready"
  | "login-required"
  | "unavailable";
