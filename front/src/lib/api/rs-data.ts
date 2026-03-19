/** 백엔드 RsData 응답 래퍼 타입. */
export interface RsData<T> {
  resultCode: string;
  msg: string;
  data: T;
}

/** API 실패를 상태 코드/코드값과 함께 전달하는 표준 에러. */
export class ApiError extends Error {
  readonly status: number;
  readonly resultCode?: string;

  constructor(message: string, status: number, resultCode?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.resultCode = resultCode;
  }
}

/** 미확인 에러를 사용자 표시 가능한 문자열로 정규화한다. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}
