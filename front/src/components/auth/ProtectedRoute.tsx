"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { restoreSession } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";
import SessionRevisionBoundary from "@/components/auth/SessionRevisionBoundary";

interface ProtectedRouteProps {
  children: ReactNode;
}

/** 비인증 사용자를 로그인 페이지로 보내는 보호 라우트 가드. */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const syncedPathRef = useRef<string | null>(null);
  const { isRestoring, hasRestored, isAuthenticated } = useAuthStore();

  useLayoutEffect(() => {
    const normalizedPath = pathname || "/";
    if (isRestoring || !hasRestored || !isAuthenticated) {
      if (!isAuthenticated) {
        syncedPathRef.current = null;
      }
      return;
    }

    if (syncedPathRef.current === normalizedPath) {
      return;
    }

    syncedPathRef.current = normalizedPath;
    void restoreSession({ force: true });
  }, [hasRestored, isAuthenticated, isRestoring, pathname]);

  useEffect(() => {
    if (!isRestoring && hasRestored && !isAuthenticated) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
    }
  }, [hasRestored, isAuthenticated, isRestoring, pathname, router]);

  if (isRestoring || !hasRestored) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        세션을 복원하고 있습니다...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        인증이 필요해 로그인 페이지로 이동합니다...
      </div>
    );
  }

  return <SessionRevisionBoundary>{children}</SessionRevisionBoundary>;
}
