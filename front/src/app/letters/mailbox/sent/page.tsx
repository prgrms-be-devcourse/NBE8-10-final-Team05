"use client";

import React, { useEffect, useState } from "react";
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
import { requestData } from "@/lib/api/http-client";

// 1. 백엔드 LetterStatus와 일치하는 타입 정의
interface SentLetter {
  id: number;
  title: string;
  content: string;
  status: "SENT" | "ACCEPTED" | "WRITING" | "REPLIED";
  createdDate: string;
}

export default function SentLettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<SentLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. 편지 목록 가져오기
  useEffect(() => {
    const fetchSentLetters = async () => {
      try {
        // 백엔드 컨트롤러의 @GetMapping("/sent") 호출
        const response = await requestData<any>("/api/v1/letters/sent");

        // RsData 구조 대응 (response.data 내부에 LetterListRes가 있는 경우)
        const targetData = response.data ? response.data : response;

        if (targetData && Array.isArray(targetData.letters)) {
          setLetters(targetData.letters);
        } else if (Array.isArray(targetData)) {
          setLetters(targetData);
        } else {
          setLetters([]);
        }
      } catch (error) {
        console.error("편지 목록 로드 실패:", error);
        setLetters([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSentLetters();
  }, []);

  // 3. 상태에 따른 디자인 매핑 (상태값: SENT, ACCEPTED, WRITING, REPLIED)
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
      case "SENT":
      default:
        return {
          label: "발송 완료",
          icon: <CheckCircle2 size={12} />,
          className: "text-slate-400 bg-slate-50 border-slate-100",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 font-sans pb-20 selection:bg-sky-200">
      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full sticky top-0 z-50 bg-[#EBF5FF]/80 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/50 rounded-full transition-all text-slate-500 active:scale-90"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-sky-900 flex items-center gap-2">
          <Send size={20} className="text-sky-400" />
          보낸 편지함
        </h1>
        <div className="w-10" />
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* 상단 요약 섹션 */}
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

                    {/* 상태 표시 배지 */}
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
