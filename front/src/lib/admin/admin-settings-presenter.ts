import type { GrafanaSessionState } from "@/lib/admin/admin-dashboard-types";

export function getAdminRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case "ADMIN":
      return "전체 관리자";
    case "USER":
      return "일반 회원";
    default:
      return role?.trim() || "알 수 없음";
  }
}

export function getAdminMemberStatusLabel(
  status: string | null | undefined,
): string {
  switch (status) {
    case "ACTIVE":
      return "활동 가능";
    case "SUSPENDED":
      return "이용 정지";
    case "WITHDRAWN":
      return "탈퇴 완료";
    default:
      return status?.trim() || "확인 필요";
  }
}

export function getMonitoringStatusLabel(state: GrafanaSessionState): string {
  switch (state) {
    case "ready":
      return "연결 준비 완료";
    case "login-required":
      return "로그인 필요";
    case "unavailable":
      return "연결 확인 필요";
    case "checking":
    default:
      return "상태 확인 중";
  }
}

export function getMonitoringStatusDescription(
  state: GrafanaSessionState,
): string {
  switch (state) {
    case "ready":
      return "Grafana 세션이 유효해서 관측 패널을 바로 열 수 있습니다.";
    case "login-required":
      return "Grafana에 먼저 로그인해야 패널 iframe과 상세 대시보드가 정상 표시됩니다.";
    case "unavailable":
      return "모니터링 프록시 또는 관측 스택 응답이 없어 실행 상태를 먼저 점검해야 합니다.";
    case "checking":
    default:
      return "현재 브라우저 세션으로 Grafana 응답을 확인하고 있습니다.";
  }
}

export function getMonitoringPrimaryActionLabel(
  state: GrafanaSessionState,
): string {
  return state === "login-required" ? "Grafana 로그인" : "Grafana 열기";
}

export function formatMonitoringBasePath(basePath: string): string {
  return basePath.trim() ? basePath : "same-origin (/)";
}
