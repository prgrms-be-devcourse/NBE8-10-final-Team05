import { ApiError, toErrorMessage } from "@/lib/api/rs-data";

export function getNicknameSavedNotice(): string {
  return "닉네임을 저장했어요.";
}

export function getEmailSavedNotice(): string {
  return "이메일을 변경했어요.";
}

export function getPasswordSavedNotice(): string {
  return "비밀번호를 변경했어요.";
}

export function getWithdrawNotice(): string {
  return "회원 탈퇴가 완료되었어요.";
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
  if (error instanceof ApiError) {
    if (
      error.resultCode === "409-1" &&
      error.message === "Member email already exists."
    ) {
      return "이미 사용 중인 이메일이에요. 다른 이메일을 입력해 주세요.";
    }

    if (
      error.resultCode === "401-2" &&
      error.message === "Current password is invalid."
    ) {
      return "현재 비밀번호가 맞지 않아요.";
    }
  }

  return toErrorMessage(error);
}
