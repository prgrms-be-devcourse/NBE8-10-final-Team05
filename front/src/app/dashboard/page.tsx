"use client";

import { useState } from "react";
import { fetchMe } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

/** 보호 페이지: 인증 사용자의 세션 상태를 확인하고 /auth/me 재조회 기능을 제공한다. */
export default function DashboardPage() {
  const { member } = useAuthStore();
  const [message, setMessage] = useState<string>("");

  async function handleRefreshProfile() {
    try {
      const nextMember = await fetchMe();
      setMessage(`세션 확인 완료: ${nextMember.nickname} (${nextMember.role})`);
    } catch {
      setMessage("세션 확인에 실패했습니다. 다시 로그인해 주세요.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">보호 페이지</h1>
        <p className="text-sm text-zinc-600">
          현재 로그인 사용자:{" "}
          <span className="font-medium text-zinc-900">
            {member ? `${member.nickname} (${member.email})` : "-"}
          </span>
        </p>
        <button
          type="button"
          className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          onClick={() => void handleRefreshProfile()}
        >
          /auth/me 다시 조회
        </button>
        {message && <p className="text-sm text-zinc-500">{message}</p>}
      </section>
    </div>
  );
}
