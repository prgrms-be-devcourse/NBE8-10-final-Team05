export const AUTH_HINT_COOKIE_NAME = "maumOnAuthHint";

export interface AuthHintState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isServerValidated: boolean;
}

export function parseAuthHintCookieValue(value: string | undefined): AuthHintState {
  if (value === "admin") {
    return {
      isAuthenticated: true,
      isAdmin: true,
      isServerValidated: false,
    };
  }

  if (value === "member") {
    return {
      isAuthenticated: true,
      isAdmin: false,
      isServerValidated: false,
    };
  }

  return {
    isAuthenticated: false,
    isAdmin: false,
    isServerValidated: false,
  };
}
