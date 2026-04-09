import { beforeEach, describe, expect, it, vi } from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("admin-letter-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("관리자 편지 목록 조회는 검색/필터 쿼리를 포함해 RsData의 data를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "관리자 편지 목록을 조회했습니다.",
        data: {
          letters: [
            {
              letterId: 21,
              title: "괜찮아질까요",
              senderNickname: "보낸이",
              receiverNickname: "받는이",
              latestAction: "NOTE",
              status: "SENT",
              createdAt: "2026-04-09T12:10:00",
              replyCreatedAt: null,
            },
          ],
          totalPages: 3,
          totalElements: 41,
          currentPage: 1,
          isFirst: false,
          isLast: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAdminLetters } = await import("./admin-letter-service");

    await expect(
      getAdminLetters({
        status: "SENT",
        query: "받는이",
        page: 1,
        size: 20,
      }),
    ).resolves.toMatchObject({
      totalPages: 3,
      totalElements: 41,
      currentPage: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/admin/letters?status=SENT&query=%EB%B0%9B%EB%8A%94%EC%9D%B4&page=1&size=20",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("관리자 편지 조치 요청은 액션과 메모를 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-3",
        msg: "관리자 편지 조치를 기록했습니다.",
        data: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { handleAdminLetter } = await import("./admin-letter-service");

    await expect(
      handleAdminLetter(9, {
        action: "NOTE",
        memo: "발신자 표현 수위 관찰 필요",
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/admin/letters/9/actions",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          action: "NOTE",
          memo: "발신자 표현 수위 관찰 필요",
        }),
      }),
    );
  });
});
