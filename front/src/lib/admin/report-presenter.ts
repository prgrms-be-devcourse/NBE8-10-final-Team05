import type {
  AdminReportAction,
  AdminReportListItem,
  AdminReportSortOption,
  AdminReportStatus,
  AdminReportTargetType,
} from "@/lib/admin/report-types";

const TARGET_TYPE_LABELS: Record<string, string> = {
  POST: "게시글",
  LETTER: "비밀 편지",
  COMMENT: "댓글",
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "접수",
  PROCESSED: "처리 완료",
};

const ACTION_LABELS: Record<AdminReportAction, string> = {
  REJECT: "신고 반려",
  DELETE: "콘텐츠 삭제",
  BLOCK_USER: "작성자 차단",
};

const ACTION_DESCRIPTIONS: Record<AdminReportAction, string> = {
  REJECT: "신고 사유가 충분하지 않을 때 별도 조치 없이 종료합니다.",
  DELETE: "이 신고 대상을 삭제 또는 숨김 처리합니다.",
  BLOCK_USER: "이 신고 대상 작성자의 계정을 차단 상태로 변경합니다.",
};

const DELETE_ACTION_LABELS: Partial<Record<AdminReportTargetType, string>> = {
  POST: "게시글 숨김",
  COMMENT: "댓글 삭제",
};

const DELETE_ACTION_DESCRIPTIONS: Partial<Record<AdminReportTargetType, string>> = {
  POST: "이 신고 대상 게시글을 숨김 처리합니다.",
  COMMENT: "이 신고 대상 댓글을 삭제 처리합니다.",
};

export function formatAdminReportTargetTypeLabel(value: AdminReportTargetType): string {
  return TARGET_TYPE_LABELS[value] ?? value;
}

export function formatAdminReportStatusLabel(value: AdminReportStatus): string {
  return STATUS_LABELS[value] ?? value;
}

export function formatAdminReportActionLabel(
  value: string | null | undefined,
  targetType?: AdminReportTargetType,
): string {
  if (!value) {
    return "미처리";
  }

  if (isAdminReportAction(value)) {
    if (value === "DELETE" && targetType) {
      return DELETE_ACTION_LABELS[targetType] ?? ACTION_LABELS[value];
    }

    return ACTION_LABELS[value];
  }

  return value;
}

export function getAdminReportActionDescription(
  action: AdminReportAction,
  targetType?: AdminReportTargetType,
): string {
  if (action === "DELETE" && targetType) {
    return DELETE_ACTION_DESCRIPTIONS[targetType] ?? ACTION_DESCRIPTIONS[action];
  }

  return ACTION_DESCRIPTIONS[action];
}

export function getAdminReportActionPrompt(
  action: AdminReportAction,
  targetType?: AdminReportTargetType,
): string {
  return `${formatAdminReportActionLabel(action, targetType)} 처리를 진행합니다. 계속하시겠습니까?`;
}

export function sortAdminReportsByCreatedAtDesc(
  reports: AdminReportListItem[],
): AdminReportListItem[] {
  return [...reports].sort((left, right) => {
    return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  });
}

export function sortAdminReports(
  reports: AdminReportListItem[],
  sortOption: AdminReportSortOption,
): AdminReportListItem[] {
  const sortedByLatest = sortAdminReportsByCreatedAtDesc(reports);
  if (sortOption === "LATEST") {
    return sortedByLatest;
  }

  return sortedByLatest.sort((left, right) => {
    const leftPending = left.status === "RECEIVED" ? 0 : 1;
    const rightPending = right.status === "RECEIVED" ? 0 : 1;

    if (leftPending !== rightPending) {
      return leftPending - rightPending;
    }

    return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  });
}

export function matchesAdminReportQuery(report: AdminReportListItem, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const keywords = [
    report.reportId,
    report.targetId,
    report.reporterNickname,
    report.reason,
    formatAdminReportTargetTypeLabel(report.targetType),
    formatAdminReportStatusLabel(report.status),
  ]
    .join(" ")
    .toLowerCase();

  return keywords.includes(normalizedQuery);
}

export function isAdminReportActionSupported(
  action: AdminReportAction,
  targetType: AdminReportTargetType,
): boolean {
  if (action === "DELETE") {
    return targetType === "POST" || targetType === "COMMENT";
  }

  return true;
}

export function getAdminReportActionExecutionNote(
  action: AdminReportAction,
  targetType: AdminReportTargetType,
): string {
  if (action === "REJECT") {
    return "별도 제재 없이 이 신고를 처리 완료 상태로 전환합니다.";
  }

  if (action === "DELETE" && targetType === "COMMENT") {
    return "해당 댓글을 삭제 처리하고, 같은 대상을 가리키는 미처리 신고도 함께 정리될 수 있습니다.";
  }

  if (action === "DELETE" && targetType === "POST") {
    return "해당 게시글을 숨김 처리하고, 같은 대상을 가리키는 미처리 신고도 함께 정리될 수 있습니다.";
  }

  return "작성자 계정을 차단 상태로 전환하고, 같은 대상을 가리키는 미처리 신고도 함께 정리될 수 있습니다.";
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
