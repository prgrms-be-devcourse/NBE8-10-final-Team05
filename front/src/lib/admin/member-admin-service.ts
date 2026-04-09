import { requestData } from "@/lib/api/http-client";
import type {
  AdminCreateMemberPayload,
  AdminMemberDetail,
  AdminMemberListRes,
  AdminMemberQuery,
  AdminRevokeMemberSessionsPayload,
  AdminMemberSummary,
  AdminUpdateMemberProfilePayload,
  AdminUpdateMemberRolePayload,
  AdminUpdateMemberStatusPayload,
} from "@/lib/admin/member-admin-types";

const MEMBERS_BASE_PATH = "/api/v1/members";
const ADMIN_MEMBERS_BASE_PATH = "/api/v1/admin/members";

export async function getAdminMembers(
  query: AdminMemberQuery = {},
): Promise<AdminMemberListRes> {
  const params = new URLSearchParams();

  if (query.query?.trim()) {
    params.set("query", query.query.trim());
  }

  if (query.status?.trim()) {
    params.set("status", query.status.trim());
  }

  if (query.role?.trim()) {
    params.set("role", query.role.trim());
  }

  if (query.provider?.trim()) {
    params.set("provider", query.provider.trim());
  }

  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));

  return requestData<AdminMemberListRes>(`${ADMIN_MEMBERS_BASE_PATH}?${params.toString()}`);
}

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
): Promise<AdminMemberDetail> {
  return requestData<AdminMemberDetail>(`${ADMIN_MEMBERS_BASE_PATH}/${memberId}`);
}

export async function updateMemberProfileByIdForAdmin(
  memberId: number,
  payload: AdminUpdateMemberProfilePayload,
): Promise<AdminMemberDetail> {
  return requestData<AdminMemberDetail>(`${ADMIN_MEMBERS_BASE_PATH}/${memberId}/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateMemberStatusByIdForAdmin(
  memberId: number,
  payload: AdminUpdateMemberStatusPayload,
): Promise<AdminMemberDetail> {
  return requestData<AdminMemberDetail>(`${ADMIN_MEMBERS_BASE_PATH}/${memberId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateMemberRoleByIdForAdmin(
  memberId: number,
  payload: AdminUpdateMemberRolePayload,
): Promise<AdminMemberDetail> {
  return requestData<AdminMemberDetail>(`${ADMIN_MEMBERS_BASE_PATH}/${memberId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function revokeMemberSessionsByIdForAdmin(
  memberId: number,
  payload: AdminRevokeMemberSessionsPayload = {},
): Promise<AdminMemberDetail> {
  return requestData<AdminMemberDetail>(
    `${ADMIN_MEMBERS_BASE_PATH}/${memberId}/sessions/revoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}
