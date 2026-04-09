export type ReportTargetType = "POST" | "LETTER" | "COMMENT";
export type ReportReasonCode =
  | "PROFANITY"
  | "SPAM"
  | "INAPPROPRIATE"
  | "PERSONAL_INFO"
  | "OTHER";

export interface ReportCreatePayload {
  targetId: number;
  targetType: ReportTargetType;
  reason: ReportReasonCode;
  content?: string;
}

export interface ReportReasonOption {
  code: ReportReasonCode;
  label: string;
  hint: string;
  requiresDescription?: boolean;
}

export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  {
    code: "PROFANITY",
    label: "욕설 및 비방",
    hint: "모욕, 비하, 공격적인 표현이 반복될 때 선택하세요.",
  },
  {
    code: "SPAM",
    label: "스팸 및 광고",
    hint: "홍보, 도배, 외부 유도성 메시지에 사용하세요.",
  },
  {
    code: "INAPPROPRIATE",
    label: "부적절한 내용",
    hint: "혐오감, 불쾌감, 성적 표현 등 운영 기준 위반에 사용하세요.",
  },
  {
    code: "PERSONAL_INFO",
    label: "개인정보 노출",
    hint: "전화번호, 계정 정보, 실명 등 민감정보가 포함된 경우 선택하세요.",
  },
  {
    code: "OTHER",
    label: "기타",
    hint: "선택한 사유에 맞지 않으면 상황을 직접 적어 주세요.",
    requiresDescription: true,
  },
];
