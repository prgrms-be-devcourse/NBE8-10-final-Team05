"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

/** 전역 상단에서 로그인 상태와 로그아웃 액션을 제공하는 UI. */
export default function AuthStatusBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { member, isAuthenticated, isRestoring } = useAuthStore();

  if (pathname === "/") {
    return null;
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
      <Link href="/" className="text-sm font-semibold text-zinc-800">
        maum_on
      </Link>
      <nav className="flex items-center gap-3 text-sm text-zinc-600">
        <Link href="/">홈</Link>
        <Link href="/dashboard">대시보드</Link>
        {isRestoring ? (
          <span className="text-zinc-400">세션 확인 중...</span>
        ) : isAuthenticated && member ? (
          <>
            <span className="text-zinc-500">{member.nickname}</span>
            <button
              type="button"
              className="rounded border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-50"
              onClick={() => void handleLogout()}
            >
              로그아웃
            </button>
          </>
        ) : (
          <Link href="/login" className="rounded border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-50">
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
