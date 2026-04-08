"use client";

import { useLayoutEffect } from "react";
import { useAuthHint } from "@/components/auth/AuthHintProvider";
import {
  initializeAuthRuntime,
  restoreSession,
} from "@/lib/auth/auth-service";
import {
  applyAuthTokenPayload,
  applyAuthenticatedHintState,
  markRestoreFinished,
} from "@/lib/auth/auth-store";
import type { AuthTokenPayload } from "@/lib/auth/types";

/** 앱 최초 렌더에서 세션 복원을 1회 수행하는 부트스트랩 컴포넌트. */
export default function AuthBootstrap({
  initialAuthPayload,
}: {
  initialAuthPayload?: AuthTokenPayload | null;
}) {
  const authHint = useAuthHint();

  useLayoutEffect(() => {
    initializeAuthRuntime();

    if (initialAuthPayload) {
      applyAuthTokenPayload(initialAuthPayload);
      markRestoreFinished();
      return;
    }

    if (authHint.isServerValidated) {
      applyAuthenticatedHintState(authHint);
      markRestoreFinished();
      return;
    }

    void restoreSession();
  }, [authHint, initialAuthPayload]);

  return null;
}
