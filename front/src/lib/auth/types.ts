/** 인증 API에서 공통으로 사용하는 회원 모델. */
export interface AuthMember {
  id: number;
  email: string;
  nickname: string;
  role: string;
  status: string;
}

/** 로그인/갱신 API가 반환하는 토큰 페이로드 모델. */
export interface AuthTokenPayload {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  member: AuthMember;
}

/** 인증 스토어가 다루는 화면 상태 모델. */
export interface AuthState {
  member: AuthMember | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  isLoggingIn: boolean;
  hasRestored: boolean;
  errorMessage: string | null;
}

/** 로그인 요청 바디 모델. */
export interface LoginRequest {
  email: string;
  password: string;
}
