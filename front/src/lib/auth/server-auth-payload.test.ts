import { describe, expect, it } from "vitest";
import {
  deserializeServerAuthPayload,
  serializeServerAuthPayload,
} from "@/lib/auth/server-auth-payload";
import type { AuthTokenPayload } from "@/lib/auth/types";

const payload: AuthTokenPayload = {
  accessToken: "access-token",
  tokenType: "Bearer",
  expiresInSeconds: 3600,
  member: {
    id: 7,
    email: "member@test.com",
    nickname: "테스터",
    role: "USER",
    status: "ACTIVE",
  },
};

describe("server-auth-payload", () => {
  it("서버 주입 인증 페이로드를 헤더 문자열로 직렬화하고 복원한다", () => {
    const serialized = serializeServerAuthPayload(payload);

    expect(deserializeServerAuthPayload(serialized)).toEqual(payload);
  });

  it("형식이 잘못된 헤더 값은 무시한다", () => {
    expect(deserializeServerAuthPayload("not-json")).toBeNull();
    expect(
      deserializeServerAuthPayload(
        encodeURIComponent(JSON.stringify({ accessToken: "missing-member" })),
      ),
    ).toBeNull();
  });
});
