// app/letters/mailbox/page.tsx
"use client";

import React, { useState } from "react";
import {
  Mail,
  Send,
  Heart,
  Droplets,
  ChevronRight,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";

type MailboxTab = "received" | "sent";

export default function MailboxPage() {
  const [activeTab, setActiveTab] = useState<MailboxTab>("received");

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 flex flex-col font-sans selection:bg-blue-100">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center">
        {/* 2. Tab Selector */}
        <div className="bg-white/40 p-1.5 rounded-2xl flex gap-2 mb-10 shadow-sm">
          <button
            onClick={() => setActiveTab("received")}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "received"
                ? "bg-white text-sky-600 shadow-md"
                : "text-slate-500 hover:text-sky-400"
            }`}
          >
            받은 편지함
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "sent"
                ? "bg-white text-sky-600 shadow-md"
                : "text-slate-500 hover:text-sky-400"
            }`}
          >
            보낸 편지함
          </button>
        </div>

        {/* 3. Main Highlight Card (이미지 중앙 카드 참고) */}
        <section className="w-full max-w-md mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-white flex flex-col items-center text-center">
            <span className="text-xs font-bold text-sky-400 bg-sky-50 px-3 py-1 rounded-full mb-6">
              {activeTab === "received"
                ? "따뜻한 연결의 시작"
                : "나의 진심을 담은 기록"}
            </span>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {activeTab === "received"
                ? "편지가 도착했습니다"
                : "파도에 실어 보낸 마음"}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-10">
              {activeTab === "received"
                ? "누군가의 소중한 진심이 담긴 편지가\n당신의 마음을 두드리고 있어요."
                : "당신이 보낸 편지들이 바다 너머\n누군가에게 따뜻한 위로가 되고 있을 거예요."}
            </p>

            <div className="relative w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center mb-10 shadow-inner group cursor-pointer hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-sky-400/10 rounded-full animate-ping opacity-20" />
              {activeTab === "received" ? (
                <Mail size={48} className="text-sky-400" />
              ) : (
                <Send size={48} className="text-sky-400" />
              )}
            </div>

            <button className="text-sky-500 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              {activeTab === "received" ? "편지 열어보기" : "보낸 기록 보기"}
              <ChevronRight size={18} />
            </button>

            {/* Pagination Dots */}
            <div className="flex gap-2 mt-8">
              <div className="w-6 h-1.5 bg-sky-400 rounded-full" />
              <div className="w-1.5 h-1.5 bg-sky-100 rounded-full" />
              <div className="w-1.5 h-1.5 bg-sky-100 rounded-full" />
            </div>
          </div>
        </section>

        {/* 4. Sub List Cards (이미지 하단 카드 3개 참고) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Card 1 */}
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] flex items-center gap-4 hover:bg-white transition-colors cursor-pointer border border-white/40 shadow-sm group">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-400 group-hover:bg-sky-400 group-hover:text-white transition-colors">
              <Droplets size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold">
                최근 {activeTab === "received" ? "받은" : "보낸"} 편지
              </p>
              <p className="text-slate-700 font-bold">
                3일 전 {activeTab === "received" ? "도착" : "발송"}
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] flex items-center gap-4 hover:bg-white transition-colors cursor-pointer border border-white/40 shadow-sm group">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-400 group-hover:bg-rose-400 group-hover:text-white transition-colors">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold">나의 보관함</p>
              <p className="text-slate-700 font-bold">12통의 진심</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] flex items-center gap-4 hover:bg-white transition-colors cursor-pointer border border-white/40 shadow-sm group">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-400 group-hover:text-white transition-colors">
              <Send size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold">새 편지 쓰기</p>
              <p className="text-slate-700 font-bold">마음을 전하세요</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-center text-slate-400 text-[10px] tracking-widest uppercase">
        © 2026 MAUM-ON. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
