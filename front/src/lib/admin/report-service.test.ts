import { beforeEach, describe, expect, it, vi } from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("report-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("신고 목록 조회는 RsData의 data 배열을 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "신고 목록을 조회했습니다.",
        data: [
          {
            reportId: 7,
            reporterNickname: "신고자",
            targetType: "POST",
            targetId: 12,
            reason: "욕설",
            status: "RECEIVED",
            createdAt: "2026-03-27T11:22:33",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAdminReports } = await import("./report-service");

    await expect(getAdminReports()).resolves.toEqual([
      {
        reportId: 7,
        reporterNickname: "신고자",
        targetType: "POST",
        targetId: 12,
        reason: "욕설",
        status: "RECEIVED",
        createdAt: "2026-03-27T11:22:33",
      },
    ]);
  });

  it("신고 처리 요청은 백엔드 기본 body 형식으로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-3",
        msg: "신고 처리가 완료되었습니다.",
        data: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { handleAdminReport } = await import("./report-service");

    await expect(handleAdminReport(9, "DELETE")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/admin/reports/9/handle",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          action: "DELETE",
          adminComment: "",
          isNotify: false,
          notificationMessage: "",
        }),
      }),
    );
  });

  it("403 오류는 관리자 권한 안내 문구로 변환된다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          resultCode: "403-1",
          msg: "You do not have permission.",
          data: null,
        },
        403,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAdminReports } = await import("./report-service");
    const { toErrorMessage } = await import("@/lib/api/rs-data");

    await expect(getAdminReports()).rejects.toSatisfy((error: unknown) => {
      return toErrorMessage(error) === "관리자 권한이 필요한 화면입니다.";
    });
  });

  it("신고 404 오류는 신고 없음 안내 문구로 변환된다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          resultCode: "404-1",
          msg: "존재하지 않는 신고입니다.",
          data: null,
        },
        404,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAdminReportDetail } = await import("./report-service");
    const { toErrorMessage } = await import("@/lib/api/rs-data");

    await expect(getAdminReportDetail(999)).rejects.toSatisfy((error: unknown) => {
      return toErrorMessage(error) === "해당 신고 내역을 찾을 수 없습니다.";
    });
  });
});
