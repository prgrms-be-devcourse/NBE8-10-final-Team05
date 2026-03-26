"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Droplets, Heart, Mail, Send } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";

type MailboxTab = "received" | "sent";

const MAILBOX_TAB_CONTENT: Record<
  MailboxTab,
  {
    badge: string;
    title: string;
    description: string[];
    actionLabel: string;
    actionHref: string;
    recentLabel: string;
    recentValue: string;
    archiveValue: string;
  }
> = {
  received: {
    badge: "따뜻한 연결의 시작",
    title: "편지가 도착했습니다",
    description: [
      "누군가의 소중한 진심이 담긴 편지가",
      "당신의 마음을 두드리고 있어요.",
    ],
    actionLabel: "편지 열어보기",
    actionHref: "/letters/mailbox/receive",
    recentLabel: "최근 받은 편지",
    recentValue: "도착한 편지를 확인해 보세요",
    archiveValue: "받은 마음을 다시 꺼내보기",
  },
  sent: {
    badge: "나의 진심을 담은 기록",
    title: "파도에 실어 보낸 마음",
    description: [
      "당신이 보낸 편지들이 바다 너머",
      "누군가에게 따뜻한 위로가 되고 있을 거예요.",
    ],
    actionLabel: "보낸 기록 보기",
    actionHref: "/letters/mailbox/sent",
    recentLabel: "최근 보낸 편지",
    recentValue: "최근 띄운 마음을 다시 보기",
    archiveValue: "보낸 진심들을 모아보기",
  },
};

export default function MailboxPage() {
  const [activeTab, setActiveTab] = useState<MailboxTab>("received");
  const current = MAILBOX_TAB_CONTENT[activeTab];

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 selection:bg-blue-100">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-12">
        <div className="mb-10 flex items-center justify-center gap-10 border-b border-[#dbe7f7]">
          <button
            onClick={() => setActiveTab("received")}
            className={`-mb-px border-b-2 px-1 pb-3 text-lg font-bold transition-colors ${
              activeTab === "received"
                ? "border-[#78A7E6] text-[#233552]"
                : "border-transparent text-[#6f84a5] hover:text-[#4f6f98]"
            }`}
          >
            받은 편지함
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`-mb-px border-b-2 px-1 pb-3 text-lg font-bold transition-colors ${
              activeTab === "sent"
                ? "border-[#78A7E6] text-[#233552]"
                : "border-transparent text-[#6f84a5] hover:text-[#4f6f98]"
            }`}
          >
            보낸 편지함
          </button>
        </div>

        <section className="mb-16 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col items-center rounded-[3rem] border border-white bg-white/80 p-10 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] backdrop-blur-xl">
            <span className="mb-6 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-400">
              {current.badge}
            </span>
            <h2 className="mb-2 text-3xl font-bold text-slate-800">{current.title}</h2>
            <p className="mb-10 text-sm leading-relaxed text-slate-500">
              {current.description.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>

            <Link
              href={current.actionHref}
              className="group relative mb-10 flex h-32 w-32 items-center justify-center rounded-full bg-sky-50 shadow-inner transition-transform hover:scale-105"
            >
              <div className="absolute inset-0 rounded-full bg-sky-400/10 opacity-20 animate-ping" />
              {activeTab === "received" ? (
                <Mail size={48} className="relative z-10 text-sky-400" />
              ) : (
                <Send size={48} className="relative z-10 text-sky-400" />
              )}
            </Link>

            <Link
              href={current.actionHref}
              className="flex items-center gap-2 font-bold text-sky-500 transition-all hover:gap-3"
            >
              {current.actionLabel}
              <ChevronRight size={18} />
            </Link>

            <div className="mt-8 flex gap-2">
              <div className="h-1.5 w-6 rounded-full bg-sky-400" />
              <div className="h-1.5 w-1.5 rounded-full bg-sky-100" />
              <div className="h-1.5 w-1.5 rounded-full bg-sky-100" />
            </div>
          </div>
        </section>

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href={current.actionHref}
            className="group flex items-center gap-4 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-400 transition-colors group-hover:bg-sky-400 group-hover:text-white">
              <Droplets size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">{current.recentLabel}</p>
              <p className="font-bold text-slate-700">{current.recentValue}</p>
            </div>
          </Link>

          <Link
            href={current.actionHref}
            className="group flex items-center gap-4 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-400 transition-colors group-hover:bg-rose-400 group-hover:text-white">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">나의 보관함</p>
              <p className="font-bold text-slate-700">{current.archiveValue}</p>
            </div>
          </Link>

          <Link
            href="/letters/write"
            className="group flex items-center gap-4 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400 transition-colors group-hover:bg-emerald-400 group-hover:text-white">
              <Send size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">새 편지 쓰기</p>
              <p className="font-bold text-slate-700">마음을 전하세요</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
