import { describe, expect, it } from "vitest";
import {
  formatAdminReportActionLabel,
  formatAdminReportStatusLabel,
  formatAdminReportTargetTypeLabel,
  getAdminReportActionDescription,
  sortAdminReportsByCreatedAtDesc,
} from "./report-presenter";

describe("report-presenter", () => {
  it("대상 타입 라벨을 한국어로 변환한다", () => {
    expect(formatAdminReportTargetTypeLabel("POST")).toBe("게시글");
    expect(formatAdminReportTargetTypeLabel("LETTER")).toBe("비밀 편지");
  });

  it("상태와 액션 라벨을 한국어로 변환한다", () => {
    expect(formatAdminReportStatusLabel("RECEIVED")).toBe("접수");
    expect(formatAdminReportStatusLabel("PROCESSED")).toBe("처리 완료");
    expect(formatAdminReportActionLabel("DELETE")).toBe("게시글 숨김");
    expect(getAdminReportActionDescription("BLOCK_USER")).toContain("차단");
  });

  it("신고 목록은 생성일 내림차순으로 정렬한다", () => {
    const sorted = sortAdminReportsByCreatedAtDesc([
      {
        reportId: 1,
        reporterNickname: "a",
        targetType: "POST",
        targetId: 3,
        reason: "욕설",
        status: "RECEIVED",
        createdAt: "2026-03-01T09:00:00",
      },
      {
        reportId: 2,
        reporterNickname: "b",
        targetType: "LETTER",
        targetId: 4,
        reason: "광고",
        status: "PROCESSED",
        createdAt: "2026-03-15T12:30:00",
      },
    ]);

    expect(sorted.map((report) => report.reportId)).toEqual([2, 1]);
  });
});
