import { requestData } from "@/lib/api/http-client";
import type {
  MemberSettings,
  UpdateNicknameRequest,
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
