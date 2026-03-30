"use client";

import { useEffect, useState, useCallback } from "react";
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
import { useAuthStore } from "@/lib/auth/auth-store";
import { useLetterNotification } from "@/lib/hook/useLetterNotification"; // 커스텀 훅 임포트
import { toast } from "react-hot-toast";

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
  const [letters, setLetters] = useState<LetterItem[]>([]);
  const [stats, setStats] = useState<MailboxStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // [수정] 통합 SSE 알림 훅 사용 (전역적 연결 유지)
  useLetterNotification();

  const fetchMailboxData = useCallback(
    async (showLoadingSpinner = false) => {
      if (!isAuthenticated) {
        setLetters([]);
        setStats(null);
        setIsLoading(false);
        return;
      }

      if (showLoadingSpinner) setIsLoading(true);

      try {
        const [lettersData, statsData] = await Promise.all([
          requestData<LetterListRes>("/api/v1/letters/received?page=0&size=10"),
          requestData<MailboxStats>("/api/v1/letters/stats"),
        ]);

        setLetters(
          Array.isArray(lettersData.letters) ? lettersData.letters : [],
        );
        setStats(statsData);
      } catch (error) {
        console.error("받은 편지함 데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    void fetchMailboxData(true);
  }, [fetchMailboxData, sessionRevision]);

  // [수정] 실시간 업데이트를 위한 전용 리스너 (포트 8080 직접 연결)
  useEffect(() => {
    if (!isAuthenticated) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const eventSource = new EventSource(`${baseUrl}/api/v1/letters/subscribe`, {
      withCredentials: true,
    });

    eventSource.addEventListener("new_letter", (event) => {
      // 알림은 useLetterNotification 훅에서도 띄우므로 여기서는 데이터만 갱신
      void fetchMailboxData(false);
    });

    eventSource.addEventListener("reply_arrival", () => {
      void fetchMailboxData(false);
    });

    eventSource.onerror = (err) => {
      console.error("SSE 연결 오류 (받은편지함):", err);
      eventSource.close();
      // 브라우저 기본 재연결 메커니즘을 방해하지 않으려면
      // 일정 시간 후 다시 EventSource를 생성하는 로직을 고려할 수 있습니다.
    };

    return () => eventSource.close();
  }, [isAuthenticated, fetchMailboxData]);

  function handleGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/letters/mailbox");
  }

  // ... formatDate, getRelativeTime, getStatusDisplay 함수는 기존과 동일하게 유지

  function formatDate(dateInput?: string | null): string {
    if (!dateInput) return "날짜 없음";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "날짜 형식 오류";
    return date.toLocaleDateString();
  }

  function getRelativeTime(dateString?: string): string {
    if (!dateString) return "";
    const past = new Date(dateString);
    if (Number.isNaN(past.getTime())) return "";
    const now = new Date();
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return "방금 전";
    if (diffInMins < 60) return `${diffInMins}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${diffInDays}일 전`;
  }

  function getStatusDisplay(status: LetterItem["status"]) {
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
  }

  const latestLetter = stats?.latestReceivedLetter;
  const isLetterAvailable = Boolean(latestLetter && !latestLetter.replied);

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

        {/* 상단 요약 배너 */}
        <section className="mb-12 flex flex-col items-center justify-between rounded-[2.5rem] border border-white/50 bg-white/70 p-8 shadow-sm backdrop-blur-lg md:flex-row">
          <div className="text-center md:text-left">
            {isLetterAvailable ? (
              <>
                <h2 className="mb-2 flex items-center justify-center gap-2 text-2xl font-bold text-slate-800 md:justify-start">
                  새로운 진심이 도착했어요
                  <Sparkles
                    size={24}
                    className="animate-pulse text-amber-400"
                  />
                </h2>
                <p className="text-slate-500">
                  <span className="font-semibold text-sky-600">
                    {getRelativeTime(latestLetter?.createdDate)}
                  </span>
                  에 도착한 이야기입니다. (총 {stats?.receivedCount ?? 0}개)
                </p>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-2xl font-bold text-slate-400">
                  오늘의 바다는 고요하네요
                </h2>
                <p className="italic text-slate-400">
                  아직 답장을 기다리는 새로운 편지가 없습니다.
                </p>
              </>
            )}
          </div>
          <div
            className={`mt-6 rounded-[2rem] p-5 shadow-lg md:mt-0 ${isLetterAvailable ? "bg-gradient-to-br from-sky-400 to-blue-500 text-white" : "bg-slate-200 text-slate-400"}`}
          >
            <Inbox size={32} />
          </div>
        </section>

        {/* 편지 목록 리스트 */}
        {isLoading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
            <p className="font-medium text-sky-600">편지를 불러오는 중...</p>
          </div>
        ) : letters.length === 0 ? (
          <div className="flex flex-col items-center rounded-[3rem] border-2 border-dashed border-sky-200/50 bg-white/20 py-24 text-center">
            <p className="text-lg italic text-slate-400">
              아직 바닷가에 떠밀려온 편지가 없네요...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {letters.map((letter) => {
              const statusInfo = getStatusDisplay(letter.status);
              return (
                <div
                  key={letter.id}
                  onClick={() =>
                    router.push(`/letters/mailbox/receive/${letter.id}`)
                  }
                  className={`group relative cursor-pointer rounded-[2.5rem] border p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${statusInfo.cardClass}`}
                >
                  <div className="mb-6 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 rounded-full bg-slate-100/50 px-3 py-1.5 text-[11px] font-bold text-slate-400">
                      <Clock size={14} />
                      {formatDate(letter.createdDate)}
                    </div>
                    <div
                      className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black ${statusInfo.className}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>

                  <h3 className="mb-3 line-clamp-1 text-xl font-bold text-slate-800 transition-colors group-hover:text-sky-600">
                    {letter.title || "제목 없는 편지"}
                  </h3>
                  <p className="mb-8 line-clamp-2 text-sm italic leading-relaxed text-slate-400">
                    {letter.content}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-6 text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-400 transition-all group-hover:bg-sky-400 group-hover:text-white">
                        <MessageSquare size={14} />
                      </div>
                      <span className="text-xs font-medium">
                        From. {letter.senderNickname || "익명의 파도"}
                      </span>
                    </div>
                    <Waves
                      size={16}
                      className="text-sky-200 transition-colors group-hover:text-sky-400"
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
