"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Send,
  Heart,
  Droplets,
  ChevronRight,
  Waves,
  Loader2,
  Inbox,
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";

type MailboxTab = "received" | "sent";

interface LetterSummary {
  id: number;
  title: string;
  createdDate: string;
  replied: boolean; // 답장 여부 필드 추가
}

interface MailboxStats {
  receivedCount: number;
  latestReceivedLetter?: LetterSummary;
  latestSentLetter?: LetterSummary;
}

export default function MailboxPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MailboxTab>("received");
  const [stats, setStats] = useState<MailboxStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 데이터 페칭 (통계 및 최근 편지 정보)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await requestData<MailboxStats>("/api/v1/letters/stats");
        setStats(data);
      } catch (error) {
        console.error("통계 데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // 2. 상대 시간 계산 함수
  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "도착한 편지 없음";
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return "방금 전";
    if (diffInMins < 60) return `${diffInMins}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${diffInDays}일 전`;
  };

  // 현재 탭에 따른 데이터 결정
  const latestLetter =
    activeTab === "received"
      ? stats?.latestReceivedLetter
      : stats?.latestSentLetter;

  // 3. 메인 카드 노출 여부 결정
  // 받은 편지함인 경우: 편지가 존재하고 + 아직 답장하지 않았을 때만 '편지 도착' UI 노출
  const isLetterAvailable =
    activeTab === "received"
      ? !!latestLetter && !latestLetter.replied
      : !!latestLetter;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EBF5FF] flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 flex flex-col font-sans selection:bg-blue-100">
      <header className="flex items-center justify-between px-8 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push("/letters/mailbox")}
        >
          <div className="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center text-white">
            <Waves size={20} />
          </div>
          <span className="text-xl font-bold text-sky-900">마음온</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
          <button
            onClick={() => router.push("/")}
            className="hover:text-sky-500"
          >
            홈
          </button>
          <button className="text-sky-600 border-b-2 border-sky-500 pb-1">
            편지함
          </button>
          <button className="hover:text-sky-500">커뮤니티</button>
        </nav>
        <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200" />
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center">
        {/* Tab Selector */}
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

        {/* Main Highlight Card */}
        <section className="w-full max-w-md mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-white flex flex-col items-center text-center min-h-[450px] justify-center">
            {isLetterAvailable ? (
              /* Case 1: 편지가 있고 답장이 필요한 경우 */
              <>
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
                <p className="text-slate-500 text-sm leading-relaxed mb-10 whitespace-pre-wrap">
                  {activeTab === "received"
                    ? "누군가의 소중한 진심이 담긴 편지가\n당신의 마음을 두드리고 있어요."
                    : "당신이 보낸 편지들이 바다 너머\n누군가에게 따뜻한 위로가 되고 있을 거예요."}
                </p>

                <div
                  onClick={() =>
                    latestLetter &&
                    router.push(
                      `/letters/mailbox/${activeTab === "received" ? "receive" : "sent"}/${latestLetter.id}`,
                    )
                  }
                  className="relative w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center mb-10 shadow-inner group cursor-pointer hover:scale-105 transition-transform"
                >
                  <div className="absolute inset-0 bg-sky-400/10 rounded-full animate-ping opacity-20" />
                  {activeTab === "received" ? (
                    <Mail size={48} className="text-sky-400" />
                  ) : (
                    <Send size={48} className="text-sky-400" />
                  )}
                </div>

                <button
                  onClick={() =>
                    router.push(
                      `/letters/mailbox/${activeTab === "received" ? "receive" : "sent"}`,
                    )
                  }
                  className="text-sky-500 font-bold flex items-center gap-2 hover:gap-3 transition-all"
                >
                  {activeTab === "received"
                    ? "편지 열어보기"
                    : "보낸 기록 보기"}
                  <ChevronRight size={18} />
                </button>
              </>
            ) : (
              /* Case 2: 답장할 편지가 없거나 데이터가 비어있는 경우 */
              <>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full mb-6">
                  고요한 바다
                </span>
                <h2 className="text-3xl font-bold text-slate-400 mb-2 leading-tight">
                  {activeTab === "received"
                    ? "아직 도착한\n편지가 없습니다"
                    : "보낸 편지가 없습니다"}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-10 whitespace-pre-wrap">
                  {activeTab === "received"
                    ? "새로운 진심이 파도를 타고 오길\n조금만 더 기다려 볼까요?"
                    : "먼저 누군가에게 따뜻한 진심을\n파도에 실어 보내보는 건 어떨까요?"}
                </p>

                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10 shadow-inner opacity-60">
                  <Inbox size={48} className="text-slate-300" />
                </div>

                <button
                  onClick={() => router.push("/letters/write")}
                  className="bg-sky-500 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
                >
                  먼저 편지 써보기
                  <Send size={18} />
                </button>
              </>
            )}
          </div>
        </section>

        {/* Sub List Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div
            onClick={() => router.push("/letters/mailbox/receive")}
            className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] flex items-center gap-4 hover:bg-white transition-colors cursor-pointer border border-white/40 shadow-sm group"
          >
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-400 group-hover:bg-sky-400 group-hover:text-white transition-colors">
              <Droplets size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold">
                최근 {activeTab === "received" ? "받은" : "보낸"} 편지
              </p>
              <p className="text-slate-700 font-bold">
                {getRelativeTime(latestLetter?.createdDate)}{" "}
                {activeTab === "received" ? "도착" : "발송"}
              </p>
            </div>
          </div>

          <div
            onClick={() => router.push("/letters/mailbox/receive")}
            className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] flex items-center gap-4 hover:bg-white transition-colors cursor-pointer border border-white/40 shadow-sm group"
          >
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-400 group-hover:bg-rose-400 group-hover:text-white transition-colors">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold">나의 보관함</p>
              <p className="text-slate-700 font-bold">
                {stats?.receivedCount || 0}통의 진심
              </p>
            </div>
          </div>

          <div
            onClick={() => router.push("/letters/write")}
            className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] flex items-center gap-4 hover:bg-white transition-colors cursor-pointer border border-white/40 shadow-sm group"
          >
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
    </div>
  );
}
