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
}

export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  { code: "PROFANITY", label: "욕설 및 비방" },
  { code: "SPAM", label: "스팸 및 광고" },
  { code: "INAPPROPRIATE", label: "부적절한 내용" },
  { code: "PERSONAL_INFO", label: "개인정보 노출" },
  { code: "OTHER", label: "기타" },
];
