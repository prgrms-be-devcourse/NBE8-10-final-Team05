"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  ChevronLeft,
  Calendar,
  MessageCircle,
  Waves,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";

interface SentLetter {
  id: number;
  title: string;
  content: string;
  status: string;
  createdDate: string;
}

type SentLettersResponse = SentLetter[] | { letters?: SentLetter[] };

export default function SentLettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<SentLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function handleGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/letters/mailbox");
  }

  useEffect(() => {
    const fetchSentLetters = async () => {
      try {
        const response = await requestData<SentLettersResponse>("/api/v1/letters/sent");
        if (Array.isArray(response)) {
          setLetters(response);
        } else if (Array.isArray(response?.letters)) {
          setLetters(response.letters);
        } else {
          setLetters([]);
        }
      } catch (error) {
        console.error("편지 목록을 가져오는데 실패했습니다.", error);
        setLetters([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSentLetters();
  }, []);

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

        {/* 요약 카드 */}
        <section className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-8 mb-12 flex flex-col md:flex-row items-center justify-between border border-white/40 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              나의 진심이 {Array.isArray(letters) ? letters.length : 0}번
              전달되었어요
            </h2>
            <p className="text-slate-500">
              당신이 띄워 보낸 편지들이 누군가의 하루를 따뜻하게 만들고
              있습니다.
            </p>
          </div>
          <div className="mt-6 md:mt-0 p-4 bg-sky-400 text-white rounded-2xl shadow-lg shadow-sky-200 animate-bounce-slow">
            <Waves size={32} />
          </div>
        </section>

        {/* 편지 리스트 그리드 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400"></div>
            <p className="text-sky-600 font-medium">
              바다 속 편지를 찾는 중...
            </p>
          </div>
        ) : Array.isArray(letters) && letters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {letters.map((letter) => (
              <div
                key={letter.id}
                onClick={() =>
                  router.push(`/letters/mailbox/sent/${letter.id}`)
                }
                className="group relative bg-white/80 hover:bg-white backdrop-blur-sm p-8 rounded-[2.5rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-white transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-xl"
              >
                {/* 편지 상단 장식 */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-sky-500 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    <Calendar size={12} />
                    {letter.createdDate
                      ? new Date(letter.createdDate).toLocaleDateString()
                      : "날짜 정보 없음"}
                  </div>
                  {letter.status === "REPLIED" && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                      <MessageCircle size={12} />
                      답장 도착
                    </div>
                  )}
                </div>

                {/* 편지 제목 및 본문 미리보기 */}
                <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-1 group-hover:text-sky-600 transition-colors">
                  {letter.title || "제목 없는 편지"}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 font-serif italic">
                  {letter.content}
                </p>

                {/* 하단 장식선 */}
                <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-xs text-slate-300 font-serif italic">
                    To. 바다 건너 누군가
                  </span>
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-400 group-hover:bg-sky-400 group-hover:text-white transition-all">
                    <Waves size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white/30 rounded-[3rem] border-2 border-dashed border-sky-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center text-sky-200 mb-6">
              <Send size={40} />
            </div>
            <p className="text-slate-400 text-lg mb-6">
              아직 바다로 보낸 진심이 없네요.
            </p>
            <button
              onClick={() => router.push("/letters/write")}
              className="px-8 py-3 bg-white text-sky-500 font-bold rounded-full shadow-md hover:shadow-lg hover:bg-sky-500 hover:text-white transition-all active:scale-95"
            >
              첫 편지 작성하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
