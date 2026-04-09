import { requestData, requestVoid } from "@/lib/api/http-client";
import type {
  AdminLetterDetail,
  AdminLetterHandlePayload,
  AdminLetterListRes,
  AdminLetterQuery,
} from "@/lib/admin/admin-letter-types";

const ADMIN_LETTERS_PATH = "/api/v1/admin/letters";

export async function getAdminLetters(query: AdminLetterQuery = {}): Promise<AdminLetterListRes> {
  const params = new URLSearchParams();

  if (query.status?.trim()) {
    params.set("status", query.status.trim());
  }

  if (query.query?.trim()) {
    params.set("query", query.query.trim());
  }

  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));

  return requestData<AdminLetterListRes>(`${ADMIN_LETTERS_PATH}?${params.toString()}`);
}

export async function getAdminLetterDetail(id: number): Promise<AdminLetterDetail> {
  return requestData<AdminLetterDetail>(`${ADMIN_LETTERS_PATH}/${id}`);
}

export async function handleAdminLetter(
  id: number,
  payload: AdminLetterHandlePayload,
): Promise<void> {
  return requestVoid(`${ADMIN_LETTERS_PATH}/${id}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
