export type AdminMemberStatus = "ACTIVE" | "BLOCKED" | "WITHDRAWN" | string;
export type AdminMemberRole = "USER" | "ADMIN" | string;
export type AdminMemberProviderFilter = "ALL" | "LOCAL" | "SOCIAL";
export type AdminMemberAction =
  | "BLOCK"
  | "UNBLOCK"
  | "CHANGE_ROLE"
  | "REVOKE_SESSIONS"
  | string;

export interface AdminMemberSummary {
  id: number;
  email: string;
  nickname: string;
  randomReceiveAllowed: boolean;
  socialAccount: boolean;
}

export interface AdminMemberListItem {
  id: number;
  email: string;
  nickname: string;
  role: AdminMemberRole;
  status: AdminMemberStatus;
  randomReceiveAllowed: boolean;
  socialAccount: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminMemberListRes {
  members: AdminMemberListItem[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface AdminMemberDetail extends AdminMemberListItem {
  modifiedAt: string | null;
  connectedProviders: string[];
  actionLogs: AdminMemberActionLogItem[];
  submittedReports: AdminMemberReportHistoryItem[];
  receivedReports: AdminMemberReportHistoryItem[];
  recentPosts: AdminMemberPostHistoryItem[];
  recentLetters: AdminMemberLetterHistoryItem[];
}

export interface AdminMemberActionLogItem {
  logId: number;
  action: AdminMemberAction;
  adminNickname: string;
  beforeValue: string | null;
  afterValue: string | null;
  memo: string | null;
  createdAt: string;
}

export interface AdminMemberReportHistoryItem {
  reportId: number;
  relation: "SUBMITTED" | "RECEIVED" | string;
  targetType: string;
  targetId: number;
  reason: string;
  status: string;
  processingAction: string | null;
  createdAt: string;
}

export interface AdminMemberPostHistoryItem {
  postId: number;
  title: string;
  category: string;
  status: string;
  resolutionStatus: string;
  createdAt: string;
}

export interface AdminMemberLetterHistoryItem {
  letterId: number;
  title: string;
  direction: "SENT" | "RECEIVED" | string;
  counterpartyNickname: string;
  status: string;
  createdAt: string;
}

export interface AdminMemberQuery {
  query?: string;
  status?: string;
  role?: string;
  provider?: string;
  page?: number;
  size?: number;
}

export interface AdminCreateMemberPayload {
  email: string;
  password: string;
  nickname: string;
}

export interface AdminUpdateMemberProfilePayload {
  nickname: string;
}

export interface AdminUpdateMemberStatusPayload {
  status: AdminMemberStatus;
  reason: string;
  revokeSessions?: boolean;
}

export interface AdminUpdateMemberRolePayload {
  role: AdminMemberRole;
  reason: string;
}

export interface AdminRevokeMemberSessionsPayload {
  reason?: string;
}
