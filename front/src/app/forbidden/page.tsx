"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";

export default function ForbiddenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = useMemo(() => {
    const from = searchParams.get("from");
    if (!from || !from.startsWith("/")) {
      return "/";
    }

    return from;
  }, [searchParams]);

  function handleGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(fromPath);
  }

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-10 w-full max-w-3xl">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#5e7ea5] ring-1 ring-[#d8e7f7] shadow-[0_18px_34px_-28px_rgba(96,138,190,0.72)] transition hover:bg-white hover:text-[#355b88]"
          >
            <ChevronLeft size={16} />
            돌아가기
          </button>

          <div className="home-panel mt-5 rounded-[34px] px-7 py-9 text-center sm:px-10 sm:py-11">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef5ff] text-[#5b86c4]">
              <ShieldAlert size={30} />
            </div>

            <h1 className="mt-6 text-[30px] font-semibold tracking-[-0.04em] text-[#223552] sm:text-[34px]">
              접근 권한이 없어요
            </h1>
            <p className="mt-4 text-[16px] leading-7 text-[#6e84a5]">
              요청하신 페이지 또는 기능을 이용할 권한이 없습니다.
              <br />
              로그인 상태와 권한을 다시 확인해 주세요.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex h-[52px] items-center justify-center rounded-[18px] border border-[#dbe8f7] bg-white px-6 text-[16px] font-semibold text-[#4c6f99] transition hover:bg-[#f7fbff]"
              >
                이전 페이지로
              </button>
              <Link
                href="/"
                className="inline-flex h-[52px] items-center justify-center rounded-[18px] bg-[#4f8cf0] px-6 text-[16px] font-semibold text-white shadow-[0_18px_34px_-24px_rgba(58,107,183,0.82)] transition hover:bg-[#3f80eb]"
              >
                홈으로 이동
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
