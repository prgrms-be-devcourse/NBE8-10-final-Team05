import { requestData, requestVoid } from "@/lib/api/http-client";
import type {
  AdminReportAction,
  AdminReportDetail,
  AdminReportHandlePayload,
  AdminReportListItem,
} from "@/lib/admin/report-types";

const ADMIN_REPORTS_PATH = "/api/v1/admin/reports";

export async function getAdminReports(): Promise<AdminReportListItem[]> {
  return requestData<AdminReportListItem[]>(ADMIN_REPORTS_PATH);
}

export async function getAdminReportDetail(id: number): Promise<AdminReportDetail> {
  return requestData<AdminReportDetail>(`${ADMIN_REPORTS_PATH}/${id}`);
}

export async function handleAdminReport(
  id: number,
  action: AdminReportAction,
): Promise<void> {
  const payload: AdminReportHandlePayload = {
    action,
    adminComment: "",
    isNotify: false,
    notificationMessage: "",
  };

  return requestVoid(`${ADMIN_REPORTS_PATH}/${id}/handle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
