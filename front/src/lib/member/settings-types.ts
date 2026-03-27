export interface MemberSettings {
  id: number;
  email: string;
  nickname: string;
  randomReceiveAllowed: boolean;
}

export interface UpdateNicknameRequest {
  nickname: string;
}
