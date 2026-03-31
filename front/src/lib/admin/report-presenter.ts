import type {
  AdminReportAction,
  AdminReportListItem,
  AdminReportStatus,
  AdminReportTargetType,
} from "@/lib/admin/report-types";

const TARGET_TYPE_LABELS: Record<string, string> = {
  POST: "게시글",
  LETTER: "비밀 편지",
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "접수",
  PROCESSED: "처리 완료",
};

const ACTION_LABELS: Record<AdminReportAction, string> = {
  REJECT: "신고 반려",
  DELETE: "게시글 숨김",
  BLOCK_USER: "작성자 차단",
};

const ACTION_DESCRIPTIONS: Record<AdminReportAction, string> = {
  REJECT: "신고 사유가 충분하지 않을 때 별도 조치 없이 종료합니다.",
  DELETE: "이 신고 대상 게시글을 숨김 처리합니다.",
  BLOCK_USER: "이 신고 대상 작성자의 계정을 차단 상태로 변경합니다.",
};

export function formatAdminReportTargetTypeLabel(value: AdminReportTargetType): string {
  return TARGET_TYPE_LABELS[value] ?? value;
}

export function formatAdminReportStatusLabel(value: AdminReportStatus): string {
  return STATUS_LABELS[value] ?? value;
}

export function formatAdminReportActionLabel(
  value: string | null | undefined,
): string {
  if (!value) {
    return "미처리";
  }

  if (isAdminReportAction(value)) {
    return ACTION_LABELS[value];
  }

  return value;
}

export function getAdminReportActionDescription(action: AdminReportAction): string {
  return ACTION_DESCRIPTIONS[action];
}

export function getAdminReportActionPrompt(action: AdminReportAction): string {
  return `${ACTION_LABELS[action]} 처리를 진행합니다. 계속하시겠습니까?`;
}

export function sortAdminReportsByCreatedAtDesc(
  reports: AdminReportListItem[],
): AdminReportListItem[] {
  return [...reports].sort((left, right) => {
    return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  });
}

export function formatAdminReportDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isAdminReportAction(value: string): value is AdminReportAction {
  return value === "REJECT" || value === "DELETE" || value === "BLOCK_USER";
}

function toTimestamp(value: string): number {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
