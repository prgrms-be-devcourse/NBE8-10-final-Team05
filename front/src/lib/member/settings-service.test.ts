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
          socialAccount: false,
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
      socialAccount: false,
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
          socialAccount: false,
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
          socialAccount: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { toggleRandomReceiveAllowed } = await import("./settings-service");

    await expect(toggleRandomReceiveAllowed()).resolves.toMatchObject({
      randomReceiveAllowed: false,
    });
  });

  it("이메일 수정 요청은 JSON body로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-4",
        msg: "이메일이 수정되었습니다.",
        data: {
          id: 1,
          email: "changed@hello.com",
          nickname: "마음이",
          randomReceiveAllowed: true,
          socialAccount: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { updateEmail } = await import("./settings-service");

    await expect(updateEmail("changed@hello.com")).resolves.toMatchObject({
      email: "changed@hello.com",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/members/me/email",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          email: "changed@hello.com",
        }),
      }),
    );
  });

  it("비밀번호 수정 요청은 현재/새 비밀번호를 JSON body로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-5",
        msg: "비밀번호가 수정되었습니다.",
        data: {
          id: 1,
          email: "hello@hello.com",
          nickname: "마음이",
          randomReceiveAllowed: true,
          socialAccount: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { updatePassword } = await import("./settings-service");

    await expect(updatePassword("current", "next")).resolves.toMatchObject({
      id: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/members/me/password",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          currentPassword: "current",
          newPassword: "next",
        }),
      }),
    );
  });

  it("회원 탈퇴 요청은 DELETE로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-6",
        msg: "회원 탈퇴가 완료되었습니다.",
        data: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { withdrawMember } = await import("./settings-service");

    await expect(withdrawMember("current-password")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/members/me",
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
        body: JSON.stringify({
          currentPassword: "current-password",
        }),
      }),
    );
  });
});
