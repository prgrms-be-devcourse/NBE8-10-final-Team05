"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import BrandWordmark from "@/components/branding/BrandWordmark";
import { logout } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

type MainNavKey = "home" | "stories" | "diary" | "letters";

type MainNavItem = {
  key: MainNavKey;
  label: string;
  href: string;
};

function resolveActiveNav(pathname: string): MainNavKey {
  if (pathname.startsWith("/stories")) {
    return "stories";
  }

  if (pathname.startsWith("/letters")) {
    return "letters";
  }

  if (pathname.startsWith("/dashboard")) {
    return "diary";
  }

  return "home";
}

export default function MainHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isRestoring } = useAuthStore();
  const diaryHref = isAuthenticated ? "/dashboard" : "/login";

  const navigationItems: MainNavItem[] = [
    { key: "home", label: "홈", href: "/" },
    { key: "stories", label: "고민공유", href: "/stories" },
    { key: "diary", label: "나의 일기", href: diaryHref },
    { key: "letters", label: "비밀편지", href: "/letters/mailbox" },
  ];

  const activeNav = resolveActiveNav(pathname);

  async function handleLogout() {
    await logout();
    setMobileMenuOpen(false);
    router.replace("/login");
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="마음온 홈으로 이동">
          <BrandWordmark size="header" />
        </Link>

        <nav className="hidden min-w-0 flex-1 px-4 lg:flex">
          <div className="relative flex h-[72px] w-full items-center justify-center">
            <div className="flex items-center gap-8 xl:gap-12">
              {navigationItems.map((item) => {
                const active = item.key === activeNav;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative whitespace-nowrap px-1 pt-4 pb-3 text-[20px] tracking-[-0.02em] transition before:absolute before:left-1/2 before:top-0 before:h-[4px] before:w-[34px] before:-translate-x-1/2 before:rounded-[2px] before:bg-[#79c3ff] before:transition-opacity ${
                      active
                        ? "font-bold text-[#2f3338] before:opacity-100"
                        : "font-semibold text-[#4d5259] before:opacity-0 hover:font-bold hover:text-[#2f3338] hover:before:opacity-100 focus-visible:font-bold focus-visible:text-[#2f3338] focus-visible:before:opacity-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {isRestoring ? (
            <span className="text-sm text-[#8396b6]">세션 확인 중...</span>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="text-sm font-medium text-[#506582] underline decoration-[#a9bddc] underline-offset-4 transition hover:text-[#2f4b73]"
            >
              로그아웃
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#7f8794]">
              <Link href="/login" className="transition hover:text-[#5a6372]">
                로그인
              </Link>
              <span className="text-[#c6ccd4]">|</span>
              <Link href="/signup" className="transition hover:text-[#5a6372]">
                회원가입
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-white/78 px-4 py-2.5 text-[15px] font-semibold text-[#4f698c] ring-1 ring-[#dbe8f7] shadow-[0_18px_34px_-28px_rgba(96,138,190,0.72)] transition hover:bg-white hover:text-[#2f4b73] lg:hidden"
          aria-controls="mobile-global-navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          {mobileMenuOpen ? "닫기" : "메뉴"}
        </button>
      </header>

      {mobileMenuOpen ? (
        <div id="mobile-global-navigation" className="home-panel mt-4 rounded-[28px] px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-3 text-[15px] font-medium text-[#506582]">
            {navigationItems.map((item) => {
              const active = item.key === activeNav;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-2xl px-3 py-2 transition ${
                    active ? "bg-[#eef5ff] text-[#2f4b73]" : "hover:bg-[#eef5ff]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            {isRestoring ? (
              <span className="px-3 py-2 text-sm text-[#8396b6]">세션 확인 중...</span>
            ) : isAuthenticated ? (
              <button
                type="button"
                className="px-3 py-2 text-left text-[#506582] underline decoration-[#a9bddc] underline-offset-4 transition hover:text-[#2f4b73]"
                onClick={() => {
                  void handleLogout();
                }}
              >
                로그아웃
              </button>
            ) : (
              <div className="px-3 py-2 text-sm font-semibold text-[#7f8794]">
                <Link
                  href="/login"
                  className="transition hover:text-[#5a6372]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  로그인
                </Link>
                <span className="mx-2 text-[#c6ccd4]">|</span>
                <Link
                  href="/signup"
                  className="transition hover:text-[#5a6372]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  회원가입
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </>
  );
}
