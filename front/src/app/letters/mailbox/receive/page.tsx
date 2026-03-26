"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  ChevronLeft,
  MessageSquare,
  Sparkles,
  Waves,
  Clock,
  CheckCircle2,
  PenTool,
  Loader2,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";

// --- 인터페이스 정의 ---
interface LetterSummary {
  id: number;
  title: string;
  createdDate: string;
  replied: boolean;
}

interface MailboxStats {
  totalReceivedCount: number;
  totalSentCount: number;
  latestReceivedLetter?: LetterSummary;
  latestSentLetter?: LetterSummary;
}

interface ReceivedLetter {
  id: number;
  title: string;
  content: string;
  senderNickname: string;
  status: "SENT" | "ACCEPTED" | "WRITING" | "REPLIED";
  createdDate: string;
}

type ReceivedLettersResponse = ReceivedLetter[] | { letters?: ReceivedLetter[] };

export default function ReceivedLettersPage() {
  const router = useRouter();

  // 상태 관리
  const [letters, setLetters] = useState<ReceivedLetter[]>([]);
  const [stats, setStats] = useState<MailboxStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 뒤로가기 핸들러
  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/letters/mailbox");
    }
  }, [router]);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        // 병렬 호출로 성능 최적화
        const [lettersRes, statsRes] = await Promise.all([
          requestData<ReceivedLetter[]>("/api/v1/letters/received"),
          requestData<MailboxStats>("/api/v1/letters/stats"),
        ]);

        setLetters(Array.isArray(lettersRes) ? lettersRes : []);
        setStats(statsRes);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  // 2. 시간 계산 헬퍼 함수
  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "";
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

  // 3. 최신 편지 및 노출 로직 계산
  const latestLetter = stats?.latestReceivedLetter;
  // 받은 편지함이므로: 최신 편지가 존재하고 + 아직 답장하지 않았을 때 'New' UI 노출
  const isLetterAvailable = !!latestLetter && !latestLetter.replied;

  // 4. 상태별 디자인 매핑
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "REPLIED":
        return {
          label: "답장 완료",
          icon: <CheckCircle2 size={12} />,
          className: "text-emerald-600 bg-emerald-50 border-emerald-100",
          cardClass: "bg-white/40 border-white/20 opacity-80",
        };
      case "WRITING":
        return {
          label: "답장 작성 중",
          icon: <PenTool size={12} />,
          className:
            "text-amber-600 bg-amber-50 border-amber-100 animate-pulse",
          cardClass: "bg-white shadow-sm border-white",
        };
      case "ACCEPTED":
        return {
          label: "읽음",
          icon: <Clock size={12} />,
          className: "text-sky-600 bg-sky-50 border-sky-100",
          cardClass: "bg-white/60 border-white/30",
        };
      case "SENT":
      default:
        return {
          label: "NEW",
          icon: <Sparkles size={12} />,
          className:
            "text-white bg-rose-400 border-rose-300 animate-bounce shadow-sm",
          cardClass:
            "bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border-white ring-2 ring-sky-100",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#EBF5FF] pb-20 font-sans text-slate-800">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto mt-10 max-w-6xl px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 self-start rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#5e7ea5] ring-1 ring-[#d8e7f7] shadow-[0_18px_34px_-28px_rgba(96,138,190,0.72)] transition hover:bg-white hover:text-[#355b88]"
          >
            <ChevronLeft size={16} />
            돌아가기
          </button>

          <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm sm:self-auto">
            <Inbox size={18} className="text-sky-400" />
            받은 편지함
          </div>
        </div>

        {/* 요약 카드 섹션 */}
        <section className="bg-white/70 backdrop-blur-lg rounded-[2.5rem] p-8 mb-12 flex flex-col md:flex-row items-center justify-between border border-white/50 shadow-sm transition-all">
          <div className="text-center md:text-left">
            {isLetterAvailable ? (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center md:justify-start gap-2">
                  새로운 진심이 도착했어요{" "}
                  <Sparkles
                    size={24}
                    className="text-amber-400 animate-pulse"
                  />
                </h2>
                <p className="text-slate-500">
                  <span className="font-semibold text-sky-600">
                    {getRelativeTime(latestLetter?.createdDate)}
                  </span>
                  에 도착한 소중한 이야기입니다. ({letters.length}개의 편지)
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-400 mb-2 flex items-center justify-center md:justify-start gap-2">
                  오늘의 바다는 고요하네요
                </h2>
                <p className="text-slate-400 italic">
                  아직 답장을 기다리는 새로운 편지가 없습니다.
                </p>
              </>
            )}
          </div>

          <div
            className={`mt-6 md:mt-0 p-5 rounded-[2rem] shadow-lg transition-colors duration-500 ${
              isLetterAvailable
                ? "bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-sky-200"
                : "bg-slate-200 text-slate-400 shadow-none"
            }`}
          >
            <Inbox size={32} />
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-sky-400" />
            <p className="text-sky-600 font-medium">편지를 불러오는 중...</p>
          </div>
        ) : letters.length === 0 ? (
          <div className="text-center py-24 bg-white/20 rounded-[3rem] border-2 border-dashed border-sky-200/50 flex flex-col items-center">
            <p className="text-slate-400 text-lg italic font-serif">
              아직 바닷가에 떠밀려온 편지가 없네요...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {letters.map((letter) => {
              const statusInfo = getStatusDisplay(letter.status);
              return (
                <div
                  key={letter.id}
                  onClick={() =>
                    router.push(`/letters/mailbox/receive/${letter.id}`)
                  }
                  className={`group relative p-8 rounded-[2.5rem] border transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-xl ${statusInfo.cardClass}`}
                >
                  <div className="flex justify-between items-start mb-6 gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-full uppercase">
                      <Clock size={14} />
                      {new Date(letter.createdDate).toLocaleDateString()}
                    </div>

                    <div
                      className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full border transition-all ${statusInfo.className}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>

                  <h3
                    className={`text-xl font-bold mb-3 line-clamp-1 group-hover:text-sky-600 transition-colors ${letter.status === "REPLIED" ? "text-slate-500" : "text-slate-800"}`}
                  >
                    {letter.title || "제목 없는 편지"}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 font-serif italic mb-8">
                    {letter.content}
                  </p>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-sky-50 rounded-full flex items-center justify-center text-sky-400 group-hover:bg-sky-400 group-hover:text-white transition-all">
                        <MessageSquare size={14} />
                      </div>
                      <span className="text-xs font-medium">
                        From. {letter.senderNickname || "익명의 파도"}
                      </span>
                    </div>
                    <Waves
                      size={16}
                      className="text-sky-200 group-hover:text-sky-400 transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
