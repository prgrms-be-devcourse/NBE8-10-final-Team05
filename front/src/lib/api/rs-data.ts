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
    return mapApiErrorMessage(error);
  }

  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "네트워크 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.";
    }

    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}

function mapApiErrorMessage(error: ApiError): string {
  if (
    error.resultCode === "401-2" ||
    error.message === "Invalid email or password." ||
    error.message === "Bad credentials"
  ) {
    return "이메일 또는 비밀번호가 맞지 않아요. 다시 확인해 주세요.";
  }

  if (error.resultCode === "401-1" || error.message === "Authentication is required.") {
    return "로그인이 필요한 기능이에요. 로그인 후 다시 시도해 주세요.";
  }

  if (error.resultCode === "403-1" || error.message === "You do not have permission.") {
    return "접근 권한이 없어요.";
  }

  if (error.status >= 500 || error.message === "Unexpected server error.") {
    return "서버에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
  }

  return error.message;
}
