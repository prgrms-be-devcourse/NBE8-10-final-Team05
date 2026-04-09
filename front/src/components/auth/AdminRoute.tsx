"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SessionRevisionBoundary from "@/components/auth/SessionRevisionBoundary";
import { restoreSession } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

interface AdminRouteProps {
  children: ReactNode;
}

/** 관리자 전용 화면에 비인증/비권한 사용자의 접근을 차단한다. */
export default function AdminRoute({ children }: AdminRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPath = pathname || "/admin/reports";
  const [startedSyncKey, setStartedSyncKey] = useState<string | null>(null);
  const { isRestoring, hasRestored, isAuthenticated, member } = useAuthStore();
  const isAdmin = member?.role === "ADMIN";
  const syncKey = isAuthenticated ? normalizedPath : null;
  const needsSessionSync =
    hasRestored &&
    isAuthenticated &&
    !isRestoring &&
    startedSyncKey !== syncKey;

  useLayoutEffect(() => {
    if (syncKey === null) {
      return;
    }

    if (!needsSessionSync) {
      return;
    }

    queueMicrotask(() => {
      setStartedSyncKey((current) => (current === syncKey ? current : syncKey));
    });
    void restoreSession({ force: true });
  }, [needsSessionSync, syncKey]);

  useEffect(() => {
    if (isRestoring || !hasRestored) {
      return;
    }

    if (!isAuthenticated) {
      const next = encodeURIComponent(normalizedPath);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!isAdmin) {
      router.replace("/forbidden");
    }
  }, [hasRestored, isAdmin, isAuthenticated, isRestoring, normalizedPath, router]);

  if (!hasRestored || !isAuthenticated || !isAdmin) {
    return null;
  }

  return <SessionRevisionBoundary>{children}</SessionRevisionBoundary>;
}
