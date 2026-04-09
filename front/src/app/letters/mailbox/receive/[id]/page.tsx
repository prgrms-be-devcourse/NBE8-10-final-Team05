"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  Siren,
  MailOpen,
  Heart,
  Send,
  MessageSquareText,
  Check,
  X,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData, requestVoid } from "@/lib/api/http-client";
import ReportCreateDialog from "@/components/report/ReportCreateDialog";
import { toErrorMessage } from "@/lib/api/rs-data";
import { createReport } from "@/lib/report/report-service";
import type { ReportReasonCode } from "@/lib/report/report-types";

interface ReceivedLetterDetail {
  id: number;
  title: string;
  content: string;
  createdDate: string;
  senderNickname: string;
  status: "SENT" | "ACCEPTED" | "REPLIED"; // 상태 타입 정의
  replied: boolean;
  replyContent?: string;
}

export default function ReceivedLetterDetailPage() {
  const router = useRouter();
  const params = useParams();

  const isNotifiedRef = useRef(false);
  const writingTimeoutRef = useRef<number | null>(null);

  const [letter, setLetter] = useState<ReceivedLetterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportDialogKey, setReportDialogKey] = useState(0);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportNoticeMessage, setReportNoticeMessage] = useState<string | null>(null);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(
    null,
  );
  const letterId = typeof params.id === "string" ? params.id : "";

  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/letters/mailbox/receive");
    }
  }, [router]);

  // 1. 데이터 로드 (자동 수락 API 호출 제거됨)
  useEffect(() => {
    const initPage = async () => {
      if (!letterId) return;
      try {
        const data = await requestData<ReceivedLetterDetail>(
          `/api/v1/letters/${letterId}`,
        );
        console.log("편지 상태 확인:", data.status);
        setLetter(data);
      } catch {
        alert("편지를 불러올 수 없습니다.");
        handleGoBack();
      } finally {
        setIsLoading(false);
      }
    };
    void initPage();
  }, [letterId, handleGoBack]);

  // 2. 수락 핸들러
  const handleAccept = async () => {
    if (!letterId || isProcessing) return;
    setIsProcessing(true);
    try {
      await requestVoid(`/api/v1/letters/${letterId}/accept`, {
        method: "POST",
      });
      setLetter((prev) => (prev ? { ...prev, status: "ACCEPTED" } : null));
    } catch (error) {
      alert(toErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. 거절 핸들러
  const handleReject = async () => {
    if (!letterId || isProcessing) return;
    if (
      !confirm(
        "이 고민을 다른 분께 전달할까요? 거절하시면 다시 읽을 수 없습니다.",
      )
    )
      return;

    setIsProcessing(true);
    try {
      await requestVoid(`/api/v1/letters/${letterId}/reject`, {
        method: "POST",
      });
      alert("다른 누군가에게 고민이 전달되었습니다.");
      router.push("/letters/mailbox/receive");
    } catch (error) {
      alert(toErrorMessage(error));
      setIsProcessing(false);
    }
  };

  const submitReport = async (reason: ReportReasonCode, content: string) => {
    if (!letter || isSubmittingReport) return;
    setIsSubmittingReport(true);
    setReportErrorMessage(null);
    setReportNoticeMessage(null);

    try {
      await createReport({
        targetId: letter.id,
        targetType: "LETTER",
        reason,
        content: content.length > 0 ? content : undefined,
      });

      setIsReportDialogOpen(false);
      setReportNoticeMessage("신고가 접수되었습니다. 운영팀이 확인 후 조치할 예정입니다.");

      setReportDialogKey((prev) => prev + 1);
    } catch (error) {
      setReportErrorMessage(toErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const notifyWriting = useCallback((id: string) => {
    if (isNotifiedRef.current) return;
    if (writingTimeoutRef.current !== null)
      window.clearTimeout(writingTimeoutRef.current);
    writingTimeoutRef.current = window.setTimeout(async () => {
      try {
        await requestVoid(`/api/v1/letters/${id}/writing`, { method: "POST" });
        isNotifiedRef.current = true;
      } catch {
        console.error("작성 중 신호 실패");
      }
    }, 1000);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setReplyContent(value);
    if (value.trim().length > 0 && letter?.status === "ACCEPTED" && letterId) {
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
        body: JSON.stringify({ replyContent }),
      });
      setLetter((prev) =>
        prev
          ? { ...prev, replied: true, replyContent, status: "REPLIED" }
          : null,
      );
      alert("답장이 바다로 전송되었습니다.");
      router.push("/letters/mailbox");
    } catch (error) {
      alert(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-[#EBF5FF] flex items-center justify-center font-bold">
        로딩 중...
      </div>
    );
  if (!letter) return null;

  // 핵심: 상태가 SENT인 경우에만 수락/거절을 기다림
  const isPending = letter.status === "SENT";

  return (
    <div className="min-h-screen bg-[#EBF5FF] pb-40 font-sans text-slate-800">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto mt-10 max-w-4xl px-6">
        <div className="mb-8 flex justify-between items-center">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#5e7ea5] shadow-sm transition hover:bg-white"
          >
            <ChevronLeft size={16} /> 돌아가기
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setReportErrorMessage(null);
                setReportNoticeMessage(null);
                setReportDialogKey((prev) => prev + 1);
                setIsReportDialogOpen(true);
              }}
              disabled={isSubmittingReport}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#b45e6b] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Siren size={16} />
              신고
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-sky-900">
              <MailOpen size={18} className="text-sky-400" /> 도착한 마음
            </div>
          </div>
        </div>

        {reportNoticeMessage ? (
          <div className="mb-6 rounded-[1.75rem] border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-sm font-medium text-emerald-700">
            {reportNoticeMessage}
          </div>
        ) : null}

        {/* 편지 본문 카드 */}
        <section className="bg-white/90 backdrop-blur-md rounded-[3rem] p-10 md:p-14 shadow-lg border border-white relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-100 via-sky-300 to-sky-100" />
          <div className="flex justify-between items-center mb-12 border-b border-slate-100 pb-8 text-slate-400 text-sm italic font-serif">
            <span>From. {letter.senderNickname || "익명"}</span>
            <div className="flex items-center gap-2 not-italic font-sans font-medium bg-slate-50 px-4 py-1.5 rounded-full">
              <Calendar size={16} className="text-sky-300" />
              {new Date(letter.createdDate).toLocaleDateString()}
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-8 leading-tight">
            {letter.title}
          </h2>
          <div className="text-slate-700 text-xl leading-relaxed font-serif whitespace-pre-wrap italic">
            {letter.content}
          </div>
        </section>

        {/* 인터랙션 영역 */}
        {isPending ? (
          /* [상태 1] 수락/거절 버튼 바 */
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="font-bold text-slate-800 text-lg">
                  이 고민을 들어주시겠어요?
                </p>
                <p className="text-sm text-slate-500">
                  수락하시면 답장을 남길 수 있습니다.
                </p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none px-6 py-4 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} /> 거절
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none px-8 py-4 rounded-full bg-sky-500 text-white font-bold hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} /> 수락하기
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* [상태 2] 답장 섹션 (상태가 ACCEPTED 이상일 때만 보임) */
          <section className="mt-12 animate-in fade-in zoom-in-95 duration-700">
            {letter.replied ? (
              <div className="bg-emerald-50/60 rounded-[2.5rem] p-10 border border-emerald-100">
                <div className="flex items-center gap-3 mb-6 text-emerald-700 font-bold">
                  <Heart size={20} /> <span>내가 보낸 따뜻한 답장</span>
                </div>
                <div className="text-slate-700 text-lg font-serif italic whitespace-pre-wrap">
                  {letter.replyContent}
                </div>
              </div>
            ) : (
              <div className="bg-white/60 rounded-[3rem] p-8 md:p-10 border border-white shadow-lg">
                <div className="flex items-center gap-3 text-sky-700 font-bold mb-6">
                  <MessageSquareText size={20} /> <span>답장을 남겨보세요</span>
                </div>
                <textarea
                  value={replyContent}
                  onChange={handleInputChange}
                  placeholder="따뜻한 말 한마디를 적어주세요..."
                  className="w-full h-48 bg-white/50 rounded-2xl p-6 text-lg font-serif italic outline-none focus:ring-2 ring-sky-200 border border-slate-100 transition-all resize-none"
                />
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleReplySubmit}
                    disabled={isSubmitting || !replyContent.trim()}
                    className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all shadow-lg ${isSubmitting || !replyContent.trim() ? "bg-slate-200 text-slate-400" : "bg-sky-500 text-white hover:bg-sky-600"}`}
                  >
                    {isSubmitting ? "전송 중..." : "답장 띄워보내기"}{" "}
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <ReportCreateDialog
        key={reportDialogKey}
        open={isReportDialogOpen}
        targetLabel="비밀 편지"
        isSubmitting={isSubmittingReport}
        errorMessage={reportErrorMessage}
        onClose={() => setIsReportDialogOpen(false)}
        onSubmit={submitReport}
      />
    </div>
  );
}
