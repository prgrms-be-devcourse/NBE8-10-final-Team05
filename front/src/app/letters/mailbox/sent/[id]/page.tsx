"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  Send,
  MailOpen,
  Waves,
  Heart,
  MessageCircle,
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";

interface SentLetterDetail {
  id: number;
  title: string;
  content: string;
  createdDate: string;
  replied: boolean;
  replyContent?: string;
  replyDate?: string;
}

export default function SentLetterDetailPage() {
  const router = useRouter();
  const params = useParams(); // URL에서 [id]를 가져옵니다.
  const [letter, setLetter] = useState<SentLetterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 데이터 불러오기
  useEffect(() => {
    const fetchLetterDetail = async () => {
      try {
        const data = await requestData<SentLetterDetail>(
          `/api/v1/letters/${params.id}`,
        );
        setLetter(data);
      } catch (error) {
        console.error("편지 상세 내용을 가져오는데 실패했습니다.", error);
        alert("편지를 찾을 수 없습니다.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchLetterDetail();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EBF5FF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  if (!letter) return null;

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 font-sans pb-20">
      {/* 1. Header (네비게이션) */}
      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/60 hover:bg-white rounded-full transition-all text-slate-500 shadow-sm active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-sky-900 flex items-center gap-2.5">
          <MailOpen size={22} className="text-sky-400" />
          마음의 흔적
        </h1>
        <div className="w-12" /> {/* 밸런스를 위한 빈 공간 */}
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-10">
        {/* 2. 메인 편지 카드 (첫 번째 이미지의 양피지 느낌) */}
        <section className="bg-white/90 backdrop-blur-md rounded-[3rem] p-10 md:p-14 shadow-[0_30px_70px_-15px_rgba(186,215,233,0.6)] border border-white flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* 상단 장식 라인 */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-100 via-sky-300 to-sky-100" />

          {/* 편지 메타 정보 */}
          <div className="flex justify-between items-center mb-12 border-b border-slate-100 pb-8 text-slate-400 text-sm italic font-serif">
            <span>To. 바다 건너 누군가</span>
            <div className="flex items-center gap-2 not-italic font-sans font-medium bg-slate-50 px-4 py-1.5 rounded-full">
              <Calendar size={16} className="text-sky-300" />
              {new Date(letter.createdDate).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </div>
          </div>

          {/* 편지 내용 */}
          <div className="flex-grow">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 leading-tight">
              {letter.title}
            </h2>
            <div className="text-slate-700 text-xl leading-relaxed font-serif whitespace-pre-wrap italic">
              {letter.content}
            </div>
          </div>

          {/* 하단 서명 (두 번째 이미지의 하단 카드 느낌) */}
          <div className="mt-16 pt-10 border-t border-slate-100 flex justify-between items-center">
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <Heart size={16} className="text-rose-300" />
              진심을 담아, 마음온
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-400">
              <Waves size={20} />
            </div>
          </div>
        </section>

        {/* 3. 답장 섹션 (답장이 있을 때만 표시) */}
        {letter.replied && letter.replyContent && (
          <section className="mt-12 bg-emerald-50/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-emerald-100/50 animate-in fade-in zoom-in-95 duration-700 delay-300">
            <div className="flex items-center gap-4 mb-6 border-b border-emerald-100 pb-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-500">
                <MessageCircle size={28} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-900">
                  당신의 고민에 파도가 대답합니다
                </h4>
                <p className="text-sm text-emerald-700">
                  낯선 이의 따뜻한 위로를 확인해 보세요.
                </p>
              </div>
            </div>
            <div className="text-slate-700 text-lg leading-relaxed font-serif italic whitespace-pre-wrap pl-4 border-l-2 border-emerald-200">
              {letter.replyContent}
            </div>
            {letter.replyDate && (
              <p className="text-xs text-emerald-400 mt-6 text-right font-mono">
                Reply at: {new Date(letter.replyDate).toLocaleDateString()}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
