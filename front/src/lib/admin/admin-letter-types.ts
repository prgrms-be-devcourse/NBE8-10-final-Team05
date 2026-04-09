export type AdminLetterStatus =
  | "SENT"
  | "ACCEPTED"
  | "WRITING"
  | "REPLIED"
  | "UNASSIGNED"
  | string;

export interface AdminLetterListItem {
  letterId: number;
  title: string;
  senderNickname: string | null;
  receiverNickname: string | null;
  status: AdminLetterStatus;
  createdAt: string;
  replyCreatedAt: string | null;
}

export interface AdminLetterMemberSummary {
  memberId: number;
  nickname: string;
}

export interface AdminLetterDetail {
  letterId: number;
  title: string;
  content: string;
  summary: string | null;
  replyContent: string | null;
  replySummary: string | null;
  status: AdminLetterStatus;
  createdAt: string;
  replyCreatedAt: string | null;
  sender: AdminLetterMemberSummary | null;
  receiver: AdminLetterMemberSummary | null;
}
