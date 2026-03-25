"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  ChevronLeft,
  MessageSquare,
  Sparkles,
  Waves,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";

interface ReceivedLetter {
  id: number;
  title: string;
  content: string;
  senderNickname: string;
  read: boolean;
  createdDate: string;
}

export default function ReceivedLettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<ReceivedLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReceivedLetters = async () => {
      try {
        const response = await requestData<any>("/api/v1/letters/received");
        // 페이징 처리된 경우 response.letters, 아니면 response 자체 사용
        const data = Array.isArray(response)
          ? response
          : response?.letters || [];
        setLetters(data);
      } catch (error) {
        console.error("받은 편지를 가져오는데 실패했습니다.", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReceivedLetters();
  }, []);

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 font-sans pb-20">
      {/* 상단 네비게이션 */}
      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <button
          onClick={() => router.push("/")}
          className="p-2 hover:bg-white/50 rounded-full transition-all text-slate-500 active:scale-95"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-sky-900 flex items-center gap-2">
          <Inbox size={22} className="text-sky-400" />
          받은 편지함
        </h1>
        <div className="w-10" />
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* 요약 카드: 받은 편지만의 감성 문구 */}
        <section className="bg-white/70 backdrop-blur-lg rounded-[2.5rem] p-8 mb-12 flex flex-col md:flex-row items-center justify-between border border-white/50 shadow-sm">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center md:justify-start gap-2">
              누군가의 진심이 도착했어요{" "}
              <Sparkles size={24} className="text-amber-400" />
            </h2>
            <p className="text-slate-500">
              바다를 건너 당신에게 닿은 {letters.length}개의 소중한
              이야기입니다.
            </p>
          </div>
          <div className="mt-6 md:mt-0 p-5 bg-gradient-to-br from-sky-400 to-blue-500 text-white rounded-[2rem] shadow-lg shadow-sky-200">
            <Inbox size={32} />
          </div>
        </section>

        {/* 편지 목록 */}
        {isLoading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-sky-400"></div>
          </div>
        ) : letters.length === 0 ? (
          <div className="text-center py-24 bg-white/20 rounded-[3rem] border-2 border-dashed border-sky-200/50">
            <p className="text-slate-400 text-lg italic font-serif">
              아직 바닷가에 떠밀려온 편지가 없네요...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {letters.map((letter) => (
              <div
                key={letter.id}
                onClick={() =>
                  router.push(`/letters/mailbox/receive/${letter.id}`)
                }
                className={`group relative p-8 rounded-[2.5rem] border transition-all duration-300 cursor-pointer hover:-translate-y-2
                  ${
                    letter.read
                      ? "bg-white/40 border-white/20 grayscale-[0.3]"
                      : "bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border-white animate-pulse-subtle"
                  }`}
              >
                {/* 읽음/안읽음 상태 표시 */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-full uppercase">
                    <Clock size={14} />
                    {new Date(letter.createdDate).toLocaleDateString()}
                  </div>
                  {!letter.read && (
                    <span className="flex items-center gap-1 text-[11px] font-black text-white bg-rose-400 px-3 py-1.5 rounded-full shadow-md shadow-rose-100 animate-bounce">
                      NEW
                    </span>
                  )}
                  {letter.read && (
                    <CheckCircle2 size={18} className="text-sky-300" />
                  )}
                </div>

                {/* 제목 및 미리보기 */}
                <h3
                  className={`text-xl font-bold mb-3 line-clamp-1 ${letter.read ? "text-slate-500" : "text-slate-800"}`}
                >
                  {letter.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 font-serif mb-8">
                  {letter.content}
                </p>

                {/* 하단 보낸 이 정보 */}
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center text-sky-500">
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

                {/* 읽지 않은 편지 강조 효과 */}
                {!letter.read && (
                  <div className="absolute inset-0 rounded-[2.5rem] ring-2 ring-sky-300/30 pointer-events-none"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
