export interface AdminMemberSummary {
  id: number;
  email: string;
  nickname: string;
  randomReceiveAllowed: boolean;
  socialAccount: boolean;
}

export interface AdminCreateMemberPayload {
  email: string;
  password: string;
  nickname: string;
}

export interface AdminUpdateMemberProfilePayload {
  nickname: string;
}
