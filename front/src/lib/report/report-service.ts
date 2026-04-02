import { requestData } from "@/lib/api/http-client";
import type { ReportCreatePayload } from "@/lib/report/report-types";

const REPORTS_PATH = "/api/v1/reports";

export async function createReport(payload: ReportCreatePayload): Promise<number> {
  return requestData<number>(REPORTS_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    authFailureRedirect: false,
  });
}
