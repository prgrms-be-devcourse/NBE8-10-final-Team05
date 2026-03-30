"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import MainHeader from "@/components/layout/MainHeader";
import { requestData, requestVoid } from "@/lib/api/http-client";
import { toErrorMessage } from "@/lib/api/rs-data";

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

  // 상태 및 Ref 관리
  const isNotifiedRef = useRef(false);
  const writingTimeoutRef = useRef<number | null>(null);
  const [letter, setLetter] = useState<ReceivedLetterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const letterId = typeof params.id === "string" ? params.id : "";

  // 1. [수정] 작성 중 신호 전송 함수 (최상단으로 이동 및 통합)
  const notifyWriting = useCallback((id: string) => {
    if (isNotifiedRef.current) return; // 이미 보냈다면 무시

    if (writingTimeoutRef.current !== null) {
      window.clearTimeout(writingTimeoutRef.current);
    }

    writingTimeoutRef.current = window.setTimeout(async () => {
      try {
        await requestVoid(`/api/v1/letters/${id}/writing`, {
          method: "POST",
        });
        isNotifiedRef.current = true; // ✅ 성공적으로 보냈음을 기록
      } catch {
        console.error("작성 중 신호 전송 실패");
      }
    }, 1000);
  }, []);

  // 2. [수정] 돌아가기 함수 (내부의 잘못된 useCallback 제거)
  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/letters/mailbox/receive");
    }
  }, [router]);

  // 3. 데이터 로드 및 읽음 처리
  useEffect(() => {
    const initPage = async () => {
      if (!letterId) return;
      try {
        const data = await requestData<ReceivedLetterDetail>(
          `/api/v1/letters/${letterId}`,
        );
        setLetter(data);

        // 읽음 처리 알림 (ACCEPTED)
        if (data && !data.replied) {
          await requestVoid(`/api/v1/letters/${letterId}/accept`, {
            method: "POST",
          });
        }
      } catch (error) {
        console.error("편지 로드 실패", error);
        alert("존재하지 않는 편지입니다.");
        handleGoBack();
      } finally {
        setIsLoading(false);
      }
    };
    void initPage();
  }, [letterId, handleGoBack]);

  // 4. 타이머 정리
  useEffect(() => {
    return () => {
      if (writingTimeoutRef.current !== null) {
        window.clearTimeout(writingTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setReplyContent(value);

    if (value.trim().length > 0 && !letter?.replied && letterId) {
      notifyWriting(letterId);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim() || !letterId) return;

    setIsSubmitting(true);
    try {
      await requestVoid(`/api/v1/letters/${letterId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyContent: replyContent }),
      });

      setLetter((prev) =>
        prev ? { ...prev, replied: true, replyContent: replyContent } : null,
      );

      alert("답장이 바다로 전송되었습니다.");
      router.refresh();
      router.push("/letters/mailbox");
    } catch (error) {
      alert(toErrorMessage(error) || "답장 전송에 실패했습니다.");
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
    <div className="min-h-screen bg-[#EBF5FF] pb-20 font-sans text-slate-800">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto mt-10 max-w-4xl px-6">
        {/* 상단 버튼 및 타이틀 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 self-start rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#5e7ea5] ring-1 ring-[#d8e7f7] shadow-sm transition hover:bg-white"
          >
            <ChevronLeft size={16} />
            돌아가기
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-sky-900">
            <MailOpen size={18} className="text-sky-400" />
            도착한 마음
          </div>
        </div>

        {/* 편지 본문 카드 */}
        <section className="bg-white/90 backdrop-blur-md rounded-[3rem] p-10 md:p-14 shadow-lg border border-white relative overflow-hidden">
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

        {/* 답장 섹션 */}
        <section className="mt-12">
          {letter.replied ? (
            <div className="bg-emerald-50/60 backdrop-blur-md rounded-[2.5rem] p-10 border border-emerald-100">
              <div className="flex items-center gap-3 mb-6 text-emerald-700 font-bold">
                <Heart size={20} /> <span>내가 보낸 따뜻한 답장</span>
              </div>
              <div className="text-slate-700 text-lg leading-relaxed font-serif italic whitespace-pre-wrap">
                {letter.replyContent}
              </div>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-md rounded-[3rem] p-8 md:p-10 border border-white shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-sky-700 font-bold">
                  <MessageSquareText size={20} />{" "}
                  <span>이 편지에 답장을 남겨보세요</span>
                </div>
              </div>
              <textarea
                value={replyContent}
                onChange={handleInputChange}
                placeholder="따뜻한 말 한마디가 누군가에게 큰 힘이 됩니다..."
                className="w-full h-48 bg-white/50 rounded-2xl p-6 text-lg font-serif italic outline-none focus:ring-2 ring-sky-200 border border-slate-100 transition-all resize-none"
              />
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleReplySubmit}
                  disabled={isSubmitting || !replyContent.trim()}
                  className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all shadow-lg ${
                    isSubmitting || !replyContent.trim()
                      ? "bg-slate-200 text-slate-400"
                      : "bg-sky-500 text-white hover:bg-sky-600 shadow-sky-200"
                  }`}
                >
                  {isSubmitting ? "전송 중..." : "답장 띄워보내기"}{" "}
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
