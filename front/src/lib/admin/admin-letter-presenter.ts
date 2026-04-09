import type {
  AdminLetterAction,
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

const ACTION_LABELS: Record<string, string> = {
  NOTE: "운영 메모",
  REASSIGN_RECEIVER: "새 수신자 재배정",
  BLOCK_SENDER: "발신자 차단",
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

export function formatAdminLetterActionLabel(value: string | null | undefined): string {
  if (!value) {
    return "없음";
  }

  return ACTION_LABELS[value] ?? value;
}

export function getAdminLetterActionPrompt(action: AdminLetterAction): string {
  if (action === "NOTE") {
    return "운영 메모를 기록합니다. 계속하시겠습니까?";
  }

  if (action === "REASSIGN_RECEIVER") {
    return "현재 비밀편지를 다른 수신자에게 재배정합니다. 계속하시겠습니까?";
  }

  return "발신자 계정을 차단합니다. 계속하시겠습니까?";
}

export function formatAdminLetterMemberName(
  value: string | null | undefined,
): string {
  return value?.trim().length ? value : "미배정";
}

export function formatAdminMemberState(
  member: AdminLetterMemberSummary | null | undefined,
): string {
  if (!member) {
    return "미배정";
  }

  const receiveState = member.randomReceiveAllowed ? "수신 허용" : "수신 비허용";
  return `${member.status} · ${receiveState}`;
}

function toTimestamp(value: string): number {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
