"use client";

import { useEffect } from "react";
import { useHasRefreshCookieHint } from "@/components/auth/AuthHintProvider";
import { restoreSession } from "@/lib/auth/auth-service";
import { markRestoreFinished } from "@/lib/auth/auth-store";

/** 앱 최초 렌더에서 세션 복원을 1회 수행하는 부트스트랩 컴포넌트. */
export default function AuthBootstrap() {
  const hasRefreshCookieHint = useHasRefreshCookieHint();

  useEffect(() => {
    if (!hasRefreshCookieHint) {
      markRestoreFinished();
      return;
    }

    void restoreSession();
  }, [hasRefreshCookieHint]);

  return null;
}
