"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Sparkles,
  Waves,
  Clock,
  CheckCircle2,
  PenTool,
  Loader2,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";
import { useAuthStore } from "@/lib/auth/auth-store";

// --- 인터페이스 정의 ---
interface LetterSummary {
  id: number;
  title: string;
  createdDate: string;
  replied: boolean;
}

interface MailboxStats {
  receivedCount: number;
  latestReceivedLetter?: LetterSummary;
  latestSentLetter?: LetterSummary;
}

interface LetterItem {
  id: number;
  title: string;
  content: string;
  senderNickname: string;
  status: "SENT" | "ACCEPTED" | "WRITING" | "REPLIED";
  createdDate: string;
}

interface LetterListRes {
  letters: LetterItem[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

export default function ReceivedLettersPage() {
  const router = useRouter();
  const { isAuthenticated, sessionRevision } = useAuthStore();

  // 상태 관리
  const [letters, setLetters] = useState<ReceivedLetter[]>([]);
  const [letters, setLetters] = useState<LetterItem[]>([]);
  const [stats, setStats] = useState<MailboxStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 날짜 안전 파싱 함수
  const formatDate = (dateInput: string | number[] | null | undefined) => {
    if (!dateInput) return "날짜 없음";

  useEffect(() => {
    const initData = async () => {
      if (!isAuthenticated) {
        setLetters([]);
        setStats(null);
        setIsLoading(false);
        return;
      }

      setLetters([]);
      setStats(null);
      setIsLoading(true);
      try {
        // [Refactor + Develop 통합] 다양한 응답 형태 대응
        const response = await requestData<ReceivedLettersResponse>(
          "/api/v1/letters/received",
        );

        let data: ReceivedLetter[] = [];
        if (Array.isArray(response)) {
          data = response;
        } else if (response && Array.isArray(response.letters)) {
          data = response.letters;
        }

        setLetters(data);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void initData();
  }, [isAuthenticated, sessionRevision]);
    if (Array.isArray(dateInput)) {
      // [year, month, day, hour, minute] 형태 대응
      const [year, month, day, hour = 0, minute = 0] = dateInput;
      const d = new Date(year, month - 1, day, hour, minute);
      return d.toLocaleDateString();
    }

    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? "날짜 형식 오류" : date.toLocaleDateString();
  };

  // 상대 시간 계산
  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "";
    const past = new Date(dateString);
    if (isNaN(past.getTime())) return "";

    const now = new Date();
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return "방금 전";
    if (diffInMins < 60) return `${diffInMins}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${diffInDays}일 전`;
  };

  // 데이터 초기화 로직 (컨플릭트 해결 포인트: 두 API 호출 통합)
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [lettersData, statsData] = await Promise.all([
          requestData<LetterListRes>("/api/v1/letters/received?page=0&size=10"),
          requestData<MailboxStats>("/api/v1/letters/stats"),
        ]);

        // 페이징 처리된 데이터인지, 단순 배열인지에 따라 유연하게 대응
        if (lettersData && Array.isArray(lettersData.letters)) {
          setLetters(lettersData.letters);
        } else if (Array.isArray(lettersData)) {
          setLetters(lettersData);
        }

        setStats(statsData);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

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
      default:
        return {
          label: "NEW",
          icon: <Sparkles size={12} />,
          className:
            "text-white bg-rose-400 border-rose-300 animate-bounce shadow-sm",
          cardClass: "bg-white shadow-lg border-white ring-2 ring-sky-100",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#EBF5FF] pb-20 font-sans text-slate-800">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto mt-10 max-w-6xl px-6">
        <section className="bg-white/70 backdrop-blur-lg rounded-[2.5rem] p-8 mb-12 flex flex-col md:flex-row items-center justify-between border border-white/50 shadow-sm">
          <div className="text-center md:text-left">
            {stats?.latestReceivedLetter &&
            !stats.latestReceivedLetter.replied ? (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  새로운 진심이 도착했어요{" "}
                  <Sparkles
                    size={24}
                    className="text-amber-400 animate-pulse"
                  />
                </h2>
                <p className="text-slate-500">
                  <span className="font-semibold text-sky-600">
                    {getRelativeTime(stats.latestReceivedLetter.createdDate)}
                  </span>
                  에 도착한 이야기입니다. (총 {stats.receivedCount}개)
                </p>
              </>
            ) : (
              <h2 className="text-2xl font-bold text-slate-400">
                오늘의 바다는 고요하네요
              </h2>
            )}
          </div>
          <div
            className={`mt-6 md:mt-0 p-5 rounded-[2rem] shadow-lg ${stats?.latestReceivedLetter && !stats.latestReceivedLetter.replied ? "bg-gradient-to-br from-sky-400 to-blue-500 text-white" : "bg-slate-200 text-slate-400"}`}
          >
            <Inbox size={32} />
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="animate-spin h-10 w-10 text-sky-400" />
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
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-full">
                      <Clock size={14} />
                      {formatDate(letter.createdDate)}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full border ${statusInfo.className}`}
                    >
                      {statusInfo.icon} {statusInfo.label}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 line-clamp-1 group-hover:text-sky-600 transition-colors">
                    {letter.title || "제목 없는 편지"}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 italic mb-8">
                    {letter.content}
                  </p>
                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-slate-400">
                    <span className="text-xs font-medium">
                      From. {letter.senderNickname || "익명의 파도"}
                    </span>
                    <Waves
                      size={16}
                      className="text-sky-200 group-hover:text-sky-400"
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
