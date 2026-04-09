import { describe, expect, it } from "vitest";
import {
  formatAdminReportActionLabel,
  formatAdminReportStatusLabel,
  formatAdminReportTargetTypeLabel,
  getAdminReportActionExecutionNote,
  getAdminReportActionDescription,
  matchesAdminReportQuery,
  sortAdminReports,
  sortAdminReportsByCreatedAtDesc,
} from "./report-presenter";

describe("report-presenter", () => {
  it("대상 타입 라벨을 한국어로 변환한다", () => {
    expect(formatAdminReportTargetTypeLabel("POST")).toBe("게시글");
    expect(formatAdminReportTargetTypeLabel("LETTER")).toBe("비밀 편지");
    expect(formatAdminReportTargetTypeLabel("COMMENT")).toBe("댓글");
  });

  it("상태와 액션 라벨을 한국어로 변환한다", () => {
    expect(formatAdminReportStatusLabel("RECEIVED")).toBe("접수");
    expect(formatAdminReportStatusLabel("PROCESSED")).toBe("처리 완료");
    expect(formatAdminReportActionLabel("DELETE", "POST")).toBe("게시글 숨김");
    expect(formatAdminReportActionLabel("DELETE", "COMMENT")).toBe("댓글 삭제");
    expect(getAdminReportActionDescription("BLOCK_USER")).toContain("차단");
    expect(getAdminReportActionDescription("DELETE", "COMMENT")).toContain("댓글");
    expect(getAdminReportActionExecutionNote("DELETE", "POST")).toContain("숨김");
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

  it("미처리 우선 정렬은 RECEIVED 상태를 먼저 배치한다", () => {
    const sorted = sortAdminReports(
      [
        {
          reportId: 1,
          reporterNickname: "a",
          targetType: "POST",
          targetId: 3,
          reason: "욕설",
          status: "PROCESSED",
          createdAt: "2026-03-16T09:00:00",
        },
        {
          reportId: 2,
          reporterNickname: "b",
          targetType: "COMMENT",
          targetId: 4,
          reason: "광고",
          status: "RECEIVED",
          createdAt: "2026-03-15T12:30:00",
        },
      ],
      "PENDING_FIRST",
    );

    expect(sorted.map((report) => report.reportId)).toEqual([2, 1]);
  });

  it("검색어 매칭은 신고자, 사유, 타입 라벨을 모두 포함한다", () => {
    const report = {
      reportId: 3,
      reporterNickname: "운영테스터",
      targetType: "COMMENT",
      targetId: 15,
      reason: "욕설 및 비방",
      status: "RECEIVED",
      createdAt: "2026-03-15T12:30:00",
    } as const;

    expect(matchesAdminReportQuery(report, "운영테스터")).toBe(true);
    expect(matchesAdminReportQuery(report, "댓글")).toBe(true);
    expect(matchesAdminReportQuery(report, "없는 키워드")).toBe(false);
  });
});
