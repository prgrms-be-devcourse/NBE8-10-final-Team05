import { requestData } from "@/lib/api/http-client";
import type {
  AdminCreateMemberPayload,
  AdminMemberSummary,
  AdminUpdateMemberProfilePayload,
} from "@/lib/admin/member-admin-types";

const MEMBERS_BASE_PATH = "/api/v1/members";

export async function createMemberByAdmin(
  payload: AdminCreateMemberPayload,
): Promise<AdminMemberSummary> {
  return requestData<AdminMemberSummary>(MEMBERS_BASE_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getMemberByIdForAdmin(
  memberId: number,
): Promise<AdminMemberSummary> {
  return requestData<AdminMemberSummary>(`${MEMBERS_BASE_PATH}/${memberId}`);
}

export async function updateMemberProfileByIdForAdmin(
  memberId: number,
  payload: AdminUpdateMemberProfilePayload,
): Promise<AdminMemberSummary> {
  return requestData<AdminMemberSummary>(`${MEMBERS_BASE_PATH}/${memberId}/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
