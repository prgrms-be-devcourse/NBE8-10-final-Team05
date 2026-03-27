export interface MemberSettings {
  id: number;
  email: string;
  nickname: string;
  randomReceiveAllowed: boolean;
}

export interface UpdateNicknameRequest {
  nickname: string;
}

export interface UpdateEmailRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
