"use client";

import { useEffect } from "react";
import { restoreSession } from "@/lib/auth/auth-service";

/** 앱 최초 렌더에서 세션 복원을 1회 수행하는 부트스트랩 컴포넌트. */
export default function AuthBootstrap() {
  useEffect(() => {
    void restoreSession();
  }, []);

  return null;
}
