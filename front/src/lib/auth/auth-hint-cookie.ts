export const AUTH_HINT_COOKIE_NAME = "maumOnAuthHint";

export interface AuthHintState {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function parseAuthHintCookieValue(value: string | undefined): AuthHintState {
  if (value === "admin") {
    return {
      isAuthenticated: true,
      isAdmin: true,
    };
  }

  if (value === "member") {
    return {
      isAuthenticated: true,
      isAdmin: false,
    };
  }

  return {
    isAuthenticated: false,
    isAdmin: false,
  };
}

export function persistAuthHintCookie(role: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const value = role === "ADMIN" ? "admin" : "member";
  document.cookie = `${AUTH_HINT_COOKIE_NAME}=${value}; Path=/; SameSite=Lax`;
}

export function clearAuthHintCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_HINT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}
