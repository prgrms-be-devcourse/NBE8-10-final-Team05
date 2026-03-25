"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

type StoryItem = {
  category: string;
  title: string;
  age: string;
};

const primaryNavItems = [
  { href: "#stories", label: "고민공유" },
  { href: "#diary", label: "나의 일기" },
  { href: "/letters/write", label: "비밀편지" },
  { href: "/dashboard", label: "내 정보" },
];

const storyItems: StoryItem[] = [
  { category: "연애", title: "짝사랑, 전할까?", age: "3분전" },
  { category: "진로", title: "이 길이 맞을까?", age: "15분전" },
  { category: "친구", title: "너무 서운해요 ㅠ", age: "30분전" },
  { category: "연애", title: "짝사랑, 전할까?", age: "30분전" },
  { category: "진로", title: "이 길이 맞을까?", age: "45분전" },
  { category: "연애", title: "짝사랑, 전할까?", age: "1시간전" },
  { category: "진로", title: "이 길이 맞을까?", age: "2시간전" },
  { category: "친구", title: "너무 서운해요 ㅠ", age: "3시간전" },
  { category: "연애", title: "짝사랑, 전할까?", age: "4시간전" },
  { category: "진로", title: "이 길이 맞을까?", age: "5시간전" },
];

function HeroBottle() {
  return (
    <div className="relative h-20 w-12">
      <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-t-md border-2 border-white bg-transparent" />
      <div className="absolute left-1/2 top-3 h-14 w-8 -translate-x-1/2 rounded-[1rem_1rem_0.7rem_0.7rem] border-2 border-white bg-transparent" />
      <div className="absolute left-1/2 top-8 h-6 w-3 -translate-x-1/2 rounded-sm bg-white/90" />
      <div className="absolute left-1/2 top-9 h-1 w-3 -translate-x-1/2 bg-[#7da7e4]" />
    </div>
  );
}

function LetterBottleCardIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#7da7e4] bg-[#f7fbff]">
      <div className="relative h-11 w-7">
        <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-t-sm border-2 border-[#5f86cc]" />
        <div className="absolute left-1/2 top-2 h-8 w-5 -translate-x-1/2 rounded-[0.9rem_0.9rem_0.5rem_0.5rem] border-2 border-[#5f86cc]" />
        <div className="absolute left-1/2 top-5 h-3 w-2 -translate-x-1/2 rounded-sm bg-[#5f86cc]/20" />
      </div>
    </div>
  );
}

function DiaryBookIcon() {
  return (
    <div className="flex h-20 w-16 items-center justify-center rounded-[14px] bg-[#5c79a6] text-white shadow-[0_8px_20px_-14px_rgba(40,64,102,0.85)]">
      <div className="relative h-12 w-8 rounded-r-md border-l-2 border-white/75 bg-white/10">
        <div className="absolute left-2 top-3 h-1 w-4 bg-white/75" />
        <div className="absolute left-2 top-7 h-1 w-3 bg-white/55" />
        <div className="absolute -left-1 bottom-1 h-4 w-1 rounded-full bg-white/85" />
      </div>
    </div>
  );
}

function StoryCard({ item }: { item: StoryItem }) {
  return (
    <article className="home-card rounded-[10px] px-3 py-2">
      <p className="text-[12px] font-medium text-slate-700">[{item.category}]</p>
      <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-900">
        {item.title}
      </p>
      <p className="mt-3 text-right text-[12px] text-slate-400">{item.age}</p>
    </article>
  );
}

export default function Home() {
  const router = useRouter();
  const { member, isAuthenticated, isRestoring } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setIsMobileMenuOpen(false);
    router.replace("/");
  }

  return (
    <div className="home-atmosphere min-h-screen bg-[#eef4fb] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-4 sm:px-6">
        <header className="flex items-center justify-between gap-4 px-1 py-2">
          <Link href="/" className="flex items-center gap-3">
            <div className="text-[2rem] font-semibold tracking-[-0.06em] text-[#4d688f]">
              마음온
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-[14px] font-medium text-slate-700 md:flex">
            {primaryNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-slate-900">
                {item.label}
              </Link>
            ))}
            {isRestoring ? (
              <span className="text-slate-400">세션 확인 중...</span>
            ) : isAuthenticated && member ? (
              <>
                <Link href="/dashboard" className="hover:text-slate-900">
                  {member.nickname}
                </Link>
                <button type="button" onClick={() => void handleLogout()}>
                  로그아웃
                </button>
              </>
            ) : (
              <Link href="/login" className="hover:text-slate-900">
                로그인
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="rounded-full border border-[#c5d8f7] bg-white px-4 py-2 text-sm text-slate-700 md:hidden"
            aria-controls="home-mobile-nav"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            {isMobileMenuOpen ? "닫기" : "메뉴"}
          </button>
        </header>

        <div
          id="home-mobile-nav"
          className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 md:hidden ${
            isMobileMenuOpen ? "mb-4 max-h-[360px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-[16px] border border-[#c5d8f7] bg-white px-4 py-4">
            <nav className="grid gap-2 text-sm text-slate-700">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[10px] px-3 py-2 hover:bg-[#f5f9ff]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
              {isRestoring ? (
                <p>세션 확인 중...</p>
              ) : isAuthenticated && member ? (
                <div className="flex items-center justify-between gap-3">
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    {member.nickname}
                  </Link>
                  <button type="button" onClick={() => void handleLogout()}>
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  로그인
                </Link>
              )}
            </div>
          </div>
        </div>

        <main className="flex flex-1 flex-col">
          <section className="home-hero mt-2 flex min-h-[260px] flex-col items-center justify-center rounded-none px-6 py-10 text-center text-white sm:rounded-none md:min-h-[300px]">
            <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
              마음온
            </h1>
            <p className="mt-4 text-sm text-white/90 sm:text-base">
              여기에 명언 쓰면 좋을 것 같아여
            </p>
            <div className="mt-6">
              <HeroBottle />
            </div>
          </section>

          <section className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section id="stories">
              <div>
                <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                  고민 공유
                </h2>
                <p className="mt-1 text-xl text-slate-700">오늘의 마음 이야기</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {storyItems.map((item, index) => (
                  <StoryCard key={`${item.category}-${index}`} item={item} />
                ))}
              </div>
            </section>

            <aside className="flex flex-col gap-5">
              <section className="home-panel rounded-[10px] p-0">
                <h2 className="mb-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                  비밀 편지
                </h2>
                <div className="home-card flex items-center gap-4 rounded-[10px] px-4 py-4">
                  <LetterBottleCardIcon />
                  <div className="flex-1">
                    <p className="text-[15px] leading-6 text-slate-700">
                      당신의 고민을
                      <br />
                      편하게 털어보세요
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href="/letters/write"
                        className="rounded-[6px] bg-[#7da7e4] px-3 py-1.5 text-[12px] font-medium text-white"
                      >
                        편지 쓰기
                      </Link>
                      <Link
                        href="/letters/mailbox"
                        className="rounded-[6px] border border-[#7da7e4] px-3 py-1.5 text-[12px] font-medium text-[#5f86cc]"
                      >
                        편지함
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              <section id="diary" className="home-panel rounded-[10px] p-0">
                <h2 className="mb-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                  나의 일기
                </h2>
                <div className="home-card flex items-center gap-4 rounded-[10px] px-4 py-4">
                  <DiaryBookIcon />
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[14px] font-semibold leading-6 text-slate-700">
                        오늘의
                        <br />
                        기록
                      </p>
                    </div>
                    <div className="h-20 w-14 rounded-[8px] bg-[#d9d9d9]" />
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </main>

        <footer className="mt-6 flex items-center justify-between bg-[#7da7e4] px-4 py-3 text-sm text-white">
          <span className="text-2xl font-semibold tracking-[-0.06em]">마음온</span>
          <span>마음 온</span>
        </footer>
      </div>
    </div>
  );
}
