import { toErrorMessage } from "@/lib/api/rs-data";

export function getNicknameSavedNotice(): string {
  return "닉네임을 저장했어요.";
}

export function getRandomReceiveDescription(
  randomReceiveAllowed: boolean,
): string {
  return randomReceiveAllowed
    ? "새로운 랜덤 편지를 받을 수 있어요."
    : "랜덤 편지 수신이 꺼져 있어요.";
}

export function getRandomReceiveToggleNotice(
  randomReceiveAllowed: boolean,
): string {
  return randomReceiveAllowed
    ? "이제 랜덤 편지를 받을 수 있어요."
    : "랜덤 편지 수신을 잠시 껐어요.";
}

export function toMemberSettingsErrorMessage(error: unknown): string {
  return toErrorMessage(error);
}
