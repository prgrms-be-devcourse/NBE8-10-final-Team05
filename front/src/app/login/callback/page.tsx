"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { restoreSession } from "@/lib/auth/auth-service";
import { getAuthState, setAuthError } from "@/lib/auth/auth-store";

const DEFAULT_NEXT_PATH = "/dashboard";

/** OIDC 콜백 이후 세션을 복원하고 원래 목적지로 이동한다. */
export default function LoginCallbackPage() {
  const router = useRouter();
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return DEFAULT_NEXT_PATH;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") ? next : DEFAULT_NEXT_PATH;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function completeLogin(): Promise<void> {
      setAuthError(null);

      try {
        await restoreSession({ force: true });
      } catch {
        if (!cancelled) {
          setAuthError("로그인 세션 복원에 실패했습니다. 다시 시도해 주세요.");
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        }
        return;
      }

      if (cancelled) {
        return;
      }

      if (getAuthState().isAuthenticated) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setAuthError("로그인 세션 복원에 실패했습니다. 다시 시도해 주세요.");
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }

    void completeLogin();
    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-sm text-zinc-600">
      소셜 로그인 세션을 복원하고 있습니다...
    </div>
  );
}
