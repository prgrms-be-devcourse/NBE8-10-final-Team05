"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import SessionRevisionBoundary from "@/components/auth/SessionRevisionBoundary";
import { useAuthStore } from "@/lib/auth/auth-store";

interface AdminRouteProps {
  children: ReactNode;
}

/** 관리자 전용 화면에 비인증/비권한 사용자의 접근을 차단한다. */
export default function AdminRoute({ children }: AdminRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isRestoring, hasRestored, isAuthenticated, member } = useAuthStore();
  const isAdmin = member?.role === "ADMIN";

  useEffect(() => {
    if (isRestoring || !hasRestored) {
      return;
    }

    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/admin/reports");
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!isAdmin) {
      router.replace("/forbidden");
    }
  }, [hasRestored, isAdmin, isAuthenticated, isRestoring, pathname, router]);

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
        관리자 인증이 필요해 로그인 페이지로 이동합니다...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        권한이 없어 접근할 수 없는 화면입니다...
      </div>
    );
  }

  return <SessionRevisionBoundary>{children}</SessionRevisionBoundary>;
}
