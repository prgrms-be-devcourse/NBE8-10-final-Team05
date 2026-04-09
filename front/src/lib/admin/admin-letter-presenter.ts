import type {
  AdminLetterListItem,
  AdminLetterMemberSummary,
  AdminLetterStatus,
} from "@/lib/admin/admin-letter-types";

const STATUS_LABELS: Record<string, string> = {
  SENT: "답장 대기",
  ACCEPTED: "읽음",
  WRITING: "답장 작성 중",
  REPLIED: "답장 완료",
  UNASSIGNED: "재배정 중",
};

export function formatAdminLetterStatusLabel(value: AdminLetterStatus): string {
  return STATUS_LABELS[value] ?? value;
}

export function formatAdminLetterDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

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

export function sortAdminLettersByCreatedAtDesc(
  letters: AdminLetterListItem[],
): AdminLetterListItem[] {
  return [...letters].sort((left, right) => {
    return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  });
}

export function formatAdminLetterMemberLabel(
  member: AdminLetterMemberSummary | null | undefined,
): string {
  if (!member) {
    return "미배정";
  }

  return `${member.nickname} (#${member.memberId})`;
}

export function formatAdminLetterMemberName(
  value: string | null | undefined,
): string {
  return value?.trim().length ? value : "미배정";
}

function toTimestamp(value: string): number {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
