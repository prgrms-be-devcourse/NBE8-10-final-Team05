"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  ChevronLeft,
  Calendar,
  MessageCircle,
  Waves,
  Eye,
  PenTool,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { toast } from "react-hot-toast";

// 1. 타입 정의
interface SentLetter {
  id: number;
  title: string;
  content: string;
  status: "SENT" | "ACCEPTED" | "WRITING" | "REPLIED";
  createdDate: string;
}

type SentLettersResponse = SentLetter[] | { letters?: SentLetter[] };

export default function SentLettersPage() {
  const router = useRouter();
  const { isAuthenticated, sessionRevision } = useAuthStore();
  const [letters, setLetters] = useState<SentLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // SSE 객체 중복 생성을 막기 위한 Ref
  const eventSourceRef = useRef<EventSource | null>(null);

  // 2. 데이터 가져오는 로직 (useCallback으로 메모이제이션)
  const fetchSentLetters = useCallback(
    async (showLoadingSpinner = false) => {
      if (!isAuthenticated) {
        setLetters([]);
        setIsLoading(false);
        return;
      }

      if (showLoadingSpinner) setIsLoading(true);

      try {
        // requestData 내부에서 이미 baseURL을 처리하므로 상대 경로만 사용
        const response = await requestData<SentLettersResponse>(
          "/api/v1/letters/sent",
        );

        if (Array.isArray(response)) {
          setLetters(response);
        } else if (
          response &&
          typeof response === "object" &&
          Array.isArray((response as any).letters)
        ) {
          setLetters((response as any).letters);
        } else {
          setLetters([]);
        }
      } catch (error) {
        console.error("편지 목록 로드 실패:", error);
        setLetters([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  // 3. 초기 데이터 로드
  useEffect(() => {
    fetchSentLetters(true);
  }, [fetchSentLetters, sessionRevision]);

  // 4. SSE 실시간 상태 갱신 설정
  useEffect(() => {
    if (!isAuthenticated) return;
    if (eventSourceRef.current) return; // 이미 연결되어 있다면 중복 실행 방지

    const rawBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const baseUrl = rawBaseUrl.endsWith("/")
      ? rawBaseUrl.slice(0, -1)
      : rawBaseUrl;

    // 백엔드 주소로 직접 연결 (withCredentials 포함)
    const es = new EventSource(`${baseUrl}/api/v1/letters/subscribe`, {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    const handleUpdate = (event: MessageEvent) => {
      // 'connected' 메시지나 하트비트가 아닌 실제 이벤트 데이터일 때만 갱신
      if (event.data !== "connected") {
        toast.success("편지 상태가 업데이트되었습니다");
        fetchSentLetters(false); // 로딩바 없이 목록만 최신화
      }
    };

    // 서버의 LetterNotificationAdapter에서 정의한 이벤트 리스너 등록
    es.addEventListener("new_letter", handleUpdate);
    es.addEventListener("reply_arrival", handleUpdate);
    es.addEventListener("connect", (e: any) =>
      console.log("🚀 SSE Connected:", e.data),
    );

    es.onerror = () => {
      console.error("❌ SSE 연결 오류 - 재연결 시도");
      es.close();
      eventSourceRef.current = null;
    };

    // 컴포넌트 언마운트 시 연결 종료 (중요!)
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated, fetchSentLetters]);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/letters/mailbox");
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "REPLIED":
        return {
          label: "답장 도착",
          icon: <MessageCircle size={12} />,
          className:
            "text-emerald-600 bg-emerald-50 border-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        };
      case "WRITING":
        return {
          label: "답장 작성 중",
          icon: <PenTool size={12} />,
          className:
            "text-amber-600 bg-amber-50 border-amber-100 animate-pulse",
        };
      case "ACCEPTED":
        return {
          label: "상대방이 읽음",
          icon: <Eye size={12} />,
          className: "text-sky-600 bg-sky-50 border-sky-100",
        };
      default:
        return {
          label: "발송 완료",
          icon: <CheckCircle2 size={12} />,
          className: "text-slate-400 bg-slate-50 border-slate-100",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#EBF5FF] pb-20 font-sans text-slate-800 selection:bg-sky-200">
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
            <Send size={18} className="text-sky-400" />
            보낸 편지함
          </div>
        </div>

        <section className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-8 mb-12 flex flex-col md:flex-row items-center justify-between border border-white/40 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              나의 진심이 {letters.length}번 전달되었어요
            </h2>
            <p className="text-slate-500">
              당신이 띄워 보낸 편지들이 누군가의 하루를 따뜻하게 만들고
              있습니다.
            </p>
          </div>
          <div className="mt-6 md:mt-0 p-4 bg-sky-400 text-white rounded-2xl shadow-lg shadow-sky-200">
            <Waves size={32} />
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin h-12 w-12 text-sky-400" />
            <p className="text-sky-600 font-medium">
              바다 속 편지를 찾는 중...
            </p>
          </div>
        ) : letters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {letters.map((letter) => {
              const statusInfo = getStatusDisplay(letter.status);
              return (
                <div
                  key={letter.id}
                  onClick={() =>
                    router.push(`/letters/mailbox/sent/${letter.id}`)
                  }
                  className="group relative bg-white/80 hover:bg-white backdrop-blur-sm p-8 rounded-[2.5rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-white transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-xl"
                >
                  <div className="flex justify-between items-start mb-6 gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-wider">
                      <Calendar size={12} />
                      {letter.createdDate
                        ? new Date(letter.createdDate).toLocaleDateString()
                        : "-"}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full border transition-all duration-300 ${statusInfo.className}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-1 group-hover:text-sky-600 transition-colors">
                    {letter.title || "제목 없는 편지"}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 font-serif italic mb-4">
                    {letter.content}
                  </p>

                  <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-300 font-serif italic">
                      To. 바다 건너 누군가
                    </span>
                    <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-400 group-hover:bg-sky-400 group-hover:text-white transition-all">
                      <Waves size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-white/30 rounded-[3rem] border-2 border-dashed border-sky-100 flex flex-col items-center">
            <p className="text-slate-400 text-lg mb-6">
              아직 바다로 보낸 진심이 없네요.
            </p>
            <button
              onClick={() => router.push("/letters/write")}
              className="px-8 py-3 bg-white text-sky-500 font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              첫 편지 작성하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
