"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuthHintState } from "@/lib/auth/auth-hint-cookie";

const AuthHintContext = createContext<AuthHintState>({
  isAuthenticated: false,
  isAdmin: false,
});

export default function AuthHintProvider({
  initialAuthHint,
  children,
}: {
  initialAuthHint: AuthHintState;
  children: ReactNode;
}) {
  return (
    <AuthHintContext.Provider value={initialAuthHint}>
      {children}
    </AuthHintContext.Provider>
  );
}

export function useAuthHint(): AuthHintState {
  return useContext(AuthHintContext);
}

export function useHasRefreshCookieHint(): boolean {
  return useAuthHint().isAuthenticated;
}
