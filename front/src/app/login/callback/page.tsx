"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createOidcPopupMessage,
  isOidcPopupCallback,
  notifyOidcPopupResult,
} from "@/lib/auth/auth-service";
import { setAuthError, useAuthStore } from "@/lib/auth/auth-store";

const DEFAULT_NEXT_PATH = "/dashboard";
const RESTORE_FAILURE_MESSAGE = "로그인 세션 복원에 실패했습니다. 다시 시도해 주세요.";

/** OIDC 콜백 이후 세션을 복원하고 원래 목적지로 이동한다. */
export default function LoginCallbackPage() {
  const router = useRouter();
  const { hasRestored, isAuthenticated } = useAuthStore();
  const callbackParams = useMemo(() => {
    if (typeof window === "undefined") {
      return new URLSearchParams();
    }

    return new URLSearchParams(window.location.search);
  }, []);
  const nextPath = useMemo(() => {
    const next = callbackParams.get("next");
    return next && next.startsWith("/") ? next : DEFAULT_NEXT_PATH;
  }, [callbackParams]);
  const popupMode = useMemo(() => isOidcPopupCallback(callbackParams), [callbackParams]);

  useEffect(() => {
    if (!hasRestored) {
      return;
    }

    setAuthError(null);

    if (isAuthenticated) {
      if (popupMode) {
        notifyOidcPopupResult(createOidcPopupMessage("success", nextPath));
        window.close();
        return;
      }
      router.replace(nextPath);
      router.refresh();
      return;
    }

    setAuthError(RESTORE_FAILURE_MESSAGE);
    if (popupMode) {
      notifyOidcPopupResult(
        createOidcPopupMessage("error", nextPath, RESTORE_FAILURE_MESSAGE),
      );
      window.close();
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [hasRestored, isAuthenticated, nextPath, popupMode, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-sm text-zinc-600">
      {popupMode
        ? "소셜 로그인 확인 중입니다. 잠시만 기다려 주세요..."
        : "소셜 로그인 세션을 복원하고 있습니다..."}
    </div>
  );
}
