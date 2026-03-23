"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  MailOpen,
  Waves,
  Heart,
  Send,
  MessageSquareText,
} from "lucide-react";
import { requestData, requestVoid } from "@/lib/api/http-client";

interface ReceivedLetterDetail {
  id: number;
  title: string;
  content: string;
  createdDate: string;
  senderNickname: string;
  replied: boolean;
  replyContent?: string;
}

export default function ReceivedLetterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [letter, setLetter] = useState<ReceivedLetterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchLetterDetail = async () => {
      try {
        const data = await requestData<ReceivedLetterDetail>(
          `/api/v1/letters/${params.id}`,
        );
        setLetter(data);
      } catch (error) {
        console.error("편지를 가져오는데 실패했습니다.", error);
        alert("존재하지 않는 편지입니다.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchLetterDetail();
  }, [params.id, router]);

  // 답장 전송 함수
  const handleReplySubmit = async () => {
    if (!replyContent.trim()) {
      alert("답장 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestVoid(`/api/v1/letters/received/${params.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      alert("답장이 바다로 전송되었습니다.");
      router.refresh(); // 데이터 갱신
      window.location.reload(); // 상태 업데이트를 위해 새로고침
    } catch (error) {
      console.error("답장 전송 실패:", error);
      alert("답장 전송에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/60 hover:bg-white rounded-full transition-all text-slate-500 shadow-sm"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-sky-900 flex items-center gap-2.5">
          <MailOpen size={22} className="text-sky-400" />
          도착한 마음
        </h1>
        <div className="w-12" />
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-10">
        {/* 원본 편지 카드 */}
        <section className="bg-white/90 backdrop-blur-md rounded-[3rem] p-10 md:p-14 shadow-[0_30px_70px_-15px_rgba(186,215,233,0.6)] border border-white relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-100 via-sky-300 to-sky-100" />

          <div className="flex justify-between items-center mb-12 border-b border-slate-100 pb-8 text-slate-400 text-sm italic font-serif">
            <span>From. {letter.senderNickname || "익명의 누군가"}</span>
            <div className="flex items-center gap-2 not-italic font-sans font-medium bg-slate-50 px-4 py-1.5 rounded-full">
              <Calendar size={16} className="text-sky-300" />
              {new Date(letter.createdDate).toLocaleDateString()}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 leading-tight">
              {letter.title}
            </h2>
            <div className="text-slate-700 text-xl leading-relaxed font-serif whitespace-pre-wrap italic">
              {letter.content}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50 flex justify-end">
            <Waves size={24} className="text-sky-100" />
          </div>
        </section>

        {/* 답장 영역 */}
        <section className="mt-12">
          {letter.replied ? (
            // 이미 답장을 보낸 경우
            <div className="bg-emerald-50/60 backdrop-blur-md rounded-[2.5rem] p-10 border border-emerald-100">
              <div className="flex items-center gap-3 mb-6 text-emerald-700 font-bold">
                <Heart size={20} />
                <span>내가 보낸 따뜻한 답장</span>
              </div>
              <div className="text-slate-700 text-lg leading-relaxed font-serif italic whitespace-pre-wrap">
                {letter.replyContent}
              </div>
            </div>
          ) : (
            // 아직 답장을 보내지 않은 경우 (입력창)
            <div className="bg-white/60 backdrop-blur-md rounded-[3rem] p-8 md:p-10 border border-white shadow-lg">
              <div className="flex items-center gap-3 mb-6 text-sky-700 font-bold">
                <MessageSquareText size={20} />
                <span>이 편지에 답장을 남겨보세요</span>
              </div>

              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="따뜻한 말 한마디가 누군가에게 큰 힘이 됩니다..."
                className="w-full h-48 bg-white/50 rounded-2xl p-6 text-lg font-serif italic outline-none focus:ring-2 ring-sky-200 border border-slate-100 transition-all resize-none placeholder:text-slate-300"
              />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleReplySubmit}
                  disabled={isSubmitting || !replyContent.trim()}
                  className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all shadow-lg active:scale-95
                    ${
                      isSubmitting || !replyContent.trim()
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-sky-500 text-white hover:bg-sky-600 shadow-sky-200"
                    }`}
                >
                  {isSubmitting ? "전송 중..." : "답장 띄워보내기"}
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
