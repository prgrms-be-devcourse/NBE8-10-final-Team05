export type AdminReportTargetType = "POST" | "LETTER" | "COMMENT" | string;
export type AdminReportStatus = "RECEIVED" | "PROCESSED" | string;
export type AdminReportAction = "REJECT" | "DELETE" | "BLOCK_USER";
export type AdminReportSortOption = "LATEST" | "PENDING_FIRST";

export interface AdminReportListItem {
  reportId: number;
  reporterNickname: string;
  targetType: AdminReportTargetType;
  targetId: number;
  reason: string;
  status: AdminReportStatus;
  createdAt: string;
}

export interface AdminReportTargetInfo {
  targetType: AdminReportTargetType;
  targetId: number;
  originalContent: string;
  authorNickname: string;
}

export interface AdminReportDetail {
  reportId: number;
  reporterNickname: string;
  reason: string;
  description: string;
  status: AdminReportStatus;
  processingAction: string | null;
  createdAt: string;
  targetInfo: AdminReportTargetInfo;
}

export interface AdminReportHandlePayload {
  action: AdminReportAction;
  adminComment: string;
  isNotify: boolean;
  notificationMessage: string;
}
