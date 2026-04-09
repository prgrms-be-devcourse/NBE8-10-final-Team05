import { beforeEach, describe, expect, it, vi } from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("member-admin-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("관리자 회원 목록 조회는 검색/필터 쿼리를 포함해 RsData의 data를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-7",
        msg: "관리자 회원 목록을 조회했습니다.",
        data: {
          members: [
            {
              id: 7,
              email: "member7@test.com",
              nickname: "member7",
              role: "USER",
              status: "ACTIVE",
              randomReceiveAllowed: true,
              socialAccount: true,
              createdAt: "2026-04-09T11:22:33",
              lastLoginAt: "2026-04-09T12:22:33",
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

    const { getAdminMembers } = await import("./member-admin-service");

    await expect(
      getAdminMembers({
        query: "member7",
        status: "ACTIVE",
        role: "USER",
        provider: "SOCIAL",
        page: 1,
        size: 20,
      }),
    ).resolves.toMatchObject({
      totalPages: 3,
      totalElements: 41,
      currentPage: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/admin/members?query=member7&status=ACTIVE&role=USER&provider=SOCIAL&page=1&size=20",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("관리자 회원 프로필 수정은 관리자 전용 상세 엔드포인트로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-9",
        msg: "관리자 회원 프로필을 수정했습니다.",
        data: {
          id: 9,
          email: "member9@test.com",
          nickname: "updated-member9",
          role: "USER",
          status: "ACTIVE",
          randomReceiveAllowed: true,
          socialAccount: false,
          createdAt: "2026-04-01T09:00:00",
          modifiedAt: "2026-04-09T15:30:00",
          lastLoginAt: null,
          connectedProviders: [],
          actionLogs: [],
          submittedReports: [],
          receivedReports: [],
          recentPosts: [],
          recentLetters: [],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { updateMemberProfileByIdForAdmin } = await import("./member-admin-service");

    await expect(
      updateMemberProfileByIdForAdmin(9, {
        nickname: "updated-member9",
      }),
    ).resolves.toMatchObject({
      id: 9,
      nickname: "updated-member9",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/admin/members/9/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          nickname: "updated-member9",
        }),
      }),
    );
  });

  it("관리자 회원 상태 변경은 전용 status 엔드포인트로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        resultCode: "200-10",
        msg: "관리자 회원 상태를 변경했습니다.",
        data: {
          id: 9,
          email: "member9@test.com",
          nickname: "member9",
          role: "USER",
          status: "BLOCKED",
          randomReceiveAllowed: false,
          socialAccount: false,
          createdAt: "2026-04-01T09:00:00",
          modifiedAt: "2026-04-09T15:30:00",
          lastLoginAt: null,
          connectedProviders: [],
          actionLogs: [],
          submittedReports: [],
          receivedReports: [],
          recentPosts: [],
          recentLetters: [],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { updateMemberStatusByIdForAdmin } = await import("./member-admin-service");

    await expect(
      updateMemberStatusByIdForAdmin(9, {
        status: "BLOCKED",
        reason: "운영 정책 위반",
        revokeSessions: true,
      }),
    ).resolves.toMatchObject({
      id: 9,
      status: "BLOCKED",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/admin/members/9/status",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          status: "BLOCKED",
          reason: "운영 정책 위반",
          revokeSessions: true,
        }),
      }),
    );
  });
});
