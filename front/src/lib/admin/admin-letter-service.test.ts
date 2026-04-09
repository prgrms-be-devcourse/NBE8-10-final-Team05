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

  it("관리자 편지 목록 조회는 RsData의 data 배열을 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "관리자 편지 목록을 조회했습니다.",
        data: [
          {
            letterId: 21,
            title: "괜찮아질까요",
            senderNickname: "보낸이",
            receiverNickname: "받는이",
            status: "SENT",
            createdAt: "2026-04-09T12:10:00",
            replyCreatedAt: null,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAdminLetters } = await import("./admin-letter-service");

    await expect(getAdminLetters()).resolves.toEqual([
      {
        letterId: 21,
        title: "괜찮아질까요",
        senderNickname: "보낸이",
        receiverNickname: "받는이",
        status: "SENT",
        createdAt: "2026-04-09T12:10:00",
        replyCreatedAt: null,
      },
    ]);
  });

  it("관리자 편지 404 오류는 편지 없음 안내 문구로 변환된다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          resultCode: "404-1",
          msg: "존재하지 않는 편지입니다.",
          data: null,
        },
        404,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAdminLetterDetail } = await import("./admin-letter-service");
    const { toErrorMessage } = await import("@/lib/api/rs-data");

    await expect(getAdminLetterDetail(404)).rejects.toSatisfy((error: unknown) => {
      return toErrorMessage(error) === "해당 비밀편지를 찾을 수 없습니다.";
    });
  });
});
