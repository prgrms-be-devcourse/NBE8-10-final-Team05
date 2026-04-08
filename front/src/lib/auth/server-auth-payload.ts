import type { AuthMember, AuthTokenPayload } from "@/lib/auth/types";

export const SERVER_AUTH_HINT_HEADER = "x-maum-on-server-auth";
export const SERVER_AUTH_PAYLOAD_HEADER = "x-maum-on-auth-payload";

function isAuthMember(value: unknown): value is AuthMember {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthMember>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.email === "string" &&
    typeof candidate.nickname === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.status === "string"
  );
}

function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthTokenPayload>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.tokenType === "string" &&
    typeof candidate.expiresInSeconds === "number" &&
    isAuthMember(candidate.member)
  );
}

export function serializeServerAuthPayload(payload: AuthTokenPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function deserializeServerAuthPayload(
  value: string | null,
): AuthTokenPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return isAuthTokenPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
