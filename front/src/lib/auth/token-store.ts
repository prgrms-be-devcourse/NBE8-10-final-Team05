/** 메모리 기반 access 토큰 저장소. */
let accessToken: string | null = null;

/** 최신 access 토큰을 조회한다. */
export function getAccessToken(): string | null {
  return accessToken;
}

/** access 토큰 값을 교체한다. */
export function setAccessToken(nextToken: string): void {
  accessToken = nextToken;
}

/** access 토큰을 제거한다. */
export function clearAccessToken(): void {
  accessToken = null;
}
