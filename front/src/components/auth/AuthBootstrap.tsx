"use client";

import { useLayoutEffect } from "react";
import { useAuthHint } from "@/components/auth/AuthHintProvider";
import { restoreSession } from "@/lib/auth/auth-service";
import {
  applyAuthenticatedHintState,
  markRestoreFinished,
} from "@/lib/auth/auth-store";

/** 앱 최초 렌더에서 세션 복원을 1회 수행하는 부트스트랩 컴포넌트. */
export default function AuthBootstrap() {
  const authHint = useAuthHint();

  useLayoutEffect(() => {
    if (authHint.isServerValidated) {
      applyAuthenticatedHintState(authHint);
      markRestoreFinished();
      return;
    }

    if (!authHint.isAuthenticated) {
      markRestoreFinished();
      return;
    }

    void restoreSession();
  }, [authHint]);

  return null;
}
