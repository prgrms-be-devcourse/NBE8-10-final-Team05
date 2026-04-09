"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  BookHeart,
  LayoutDashboard,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import BrandWordmark from "@/components/branding/BrandWordmark";
import { useAuthStore } from "@/lib/auth/auth-store";

interface AdminShellProps {
  children: ReactNode;
}

type AdminNavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href?: string;
  matchMode?: "exact" | "prefix";
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "대시보드", icon: LayoutDashboard, href: "/admin", matchMode: "exact" },
  { label: "회원 관리", icon: Users, href: "/admin/members", matchMode: "prefix" },
  { label: "비밀편지 관리", icon: BookHeart, href: "/admin/letters", matchMode: "prefix" },
  { label: "신고 관리", icon: ShieldAlert, href: "/admin/reports", matchMode: "prefix" },
  { label: "설정", icon: Settings, href: "/admin/settings", matchMode: "prefix" },
];

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { member } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#edf5ff] text-[#223552]">
      <div className="flex min-h-screen flex-col xl:flex-row">
        <aside className="border-b border-[#dbe7f6] bg-white/78 px-5 py-6 backdrop-blur xl:min-h-screen xl:w-[286px] xl:border-r xl:border-b-0 xl:px-4 xl:py-5">
          <div className="flex items-center gap-3 rounded-[28px] bg-[#f4f9ff] px-4 py-4">
            <Link href="/" aria-label="마음온 홈으로 이동" className="shrink-0">
              <BrandWordmark size="header" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#4f8cf0]">관리자 센터</p>
            </div>
          </div>

          <nav className="mt-6 grid gap-2">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.href
                ? item.matchMode === "exact"
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                : false;

              if (!item.href) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-[20px] px-4 py-3 text-[15px] font-semibold text-[#93a5c0]"
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                    <span className="ml-auto rounded-full bg-[#f3f7fd] px-2 py-1 text-[11px] font-medium text-[#a9b7cb]">
                      준비 중
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[20px] px-4 py-3 text-[15px] font-semibold transition ${
                    active
                      ? "bg-[#e8f2ff] text-[#3780e3]"
                      : "text-[#5b7397] hover:bg-[#f5f9ff] hover:text-[#36527c]"
                  }`}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="border-b border-[#dbe7f6] bg-[#f7fbff]/90 px-5 py-4 backdrop-blur xl:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex w-full max-w-[620px] items-center gap-3 rounded-full border border-[#dbe7f6] bg-white px-4 py-3 text-[#8ca2c1] shadow-[0_18px_36px_-30px_rgba(100,140,196,0.45)]">
                <Search size={18} />
                <input
                  type="text"
                  readOnly
                  value=""
                  placeholder="회원, 비밀편지, 신고 키워드를 관리 화면에서 확인하세요"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#9aaec9]"
                />
              </label>

              <div className="flex items-center justify-end gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dbe7f6] bg-white text-[#6d83a5] shadow-[0_18px_30px_-28px_rgba(90,127,177,0.45)]">
                  <Bell size={18} />
                </div>
                <div className="flex items-center gap-3 rounded-full border border-[#dbe7f6] bg-white px-3 py-2 shadow-[0_18px_30px_-28px_rgba(90,127,177,0.45)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f2ff] text-sm font-bold text-[#4f8cf0]">
                    {(member?.nickname ?? "A").slice(0, 1)}
                  </div>
                  <div className="pr-2">
                    <p className="text-sm font-semibold text-[#2e4668]">
                      {member?.nickname || member?.email || "관리자"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 xl:px-8 xl:py-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
