export type AdminLetterStatus =
  | "SENT"
  | "ACCEPTED"
  | "WRITING"
  | "REPLIED"
  | "UNASSIGNED"
  | string;

export type AdminLetterAction = "NOTE" | "REASSIGN_RECEIVER" | "BLOCK_SENDER";

export interface AdminLetterListItem {
  letterId: number;
  title: string;
  senderNickname: string | null;
  receiverNickname: string | null;
  latestAction: string | null;
  status: AdminLetterStatus;
  createdAt: string;
  replyCreatedAt: string | null;
}

export interface AdminLetterListRes {
  letters: AdminLetterListItem[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface AdminLetterMemberSummary {
  memberId: number;
  nickname: string;
  status: string;
  randomReceiveAllowed: boolean;
}

export interface AdminLetterActionLogItem {
  logId: number;
  action: string;
  adminNickname: string;
  memo: string | null;
  createdAt: string;
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
  actionLogs: AdminLetterActionLogItem[];
}

export interface AdminLetterQuery {
  status?: string;
  query?: string;
  page?: number;
  size?: number;
}

export interface AdminLetterHandlePayload {
  action: AdminLetterAction;
  memo: string;
}
