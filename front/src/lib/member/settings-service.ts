import { requestData, requestVoid } from "@/lib/api/http-client";
import type {
  MemberSettings,
  UpdateEmailRequest,
  UpdateNicknameRequest,
  UpdatePasswordRequest,
} from "@/lib/member/settings-types";

const MEMBER_SETTINGS_PATH = "/api/v1/members/me";

export async function getMemberSettings(): Promise<MemberSettings> {
  return requestData<MemberSettings>(MEMBER_SETTINGS_PATH);
}

export async function updateNickname(
  nickname: string,
): Promise<MemberSettings> {
  const payload: UpdateNicknameRequest = {
    nickname,
  };

  return requestData<MemberSettings>(`${MEMBER_SETTINGS_PATH}/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function toggleRandomReceiveAllowed(): Promise<MemberSettings> {
  return requestData<MemberSettings>(`${MEMBER_SETTINGS_PATH}/random-setting`, {
    method: "PATCH",
  });
}

export async function updateEmail(email: string): Promise<MemberSettings> {
  const payload: UpdateEmailRequest = {
    email,
  };

  return requestData<MemberSettings>(`${MEMBER_SETTINGS_PATH}/email`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
): Promise<MemberSettings> {
  const payload: UpdatePasswordRequest = {
    currentPassword,
    newPassword,
  };

  return requestData<MemberSettings>(`${MEMBER_SETTINGS_PATH}/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function withdrawMember(): Promise<void> {
  await requestVoid(MEMBER_SETTINGS_PATH, {
    method: "DELETE",
  });
}
