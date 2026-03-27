import { beforeEach, describe, expect, it, vi } from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("settings-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("회원 설정 조회는 RsData의 data를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "내 정보를 조회했습니다.",
        data: {
          id: 1,
          email: "hello@hello.com",
          nickname: "마음이",
          randomReceiveAllowed: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getMemberSettings } = await import("./settings-service");

    await expect(getMemberSettings()).resolves.toEqual({
      id: 1,
      email: "hello@hello.com",
      nickname: "마음이",
      randomReceiveAllowed: true,
    });
  });

  it("닉네임 수정 요청은 JSON body로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "프로필이 수정되었습니다.",
        data: {
          id: 1,
          email: "hello@hello.com",
          nickname: "새 닉네임",
          randomReceiveAllowed: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { updateNickname } = await import("./settings-service");

    await expect(updateNickname("새 닉네임")).resolves.toMatchObject({
      nickname: "새 닉네임",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/members/me/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          nickname: "새 닉네임",
        }),
      }),
    );
  });

  it("랜덤 편지 수신 토글은 변경된 상태를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-1",
        msg: "랜덤 편지 수신 설정이 변경되었습니다.",
        data: {
          id: 1,
          email: "hello@hello.com",
          nickname: "마음이",
          randomReceiveAllowed: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { toggleRandomReceiveAllowed } = await import("./settings-service");

    await expect(toggleRandomReceiveAllowed()).resolves.toMatchObject({
      randomReceiveAllowed: false,
    });
  });
});
