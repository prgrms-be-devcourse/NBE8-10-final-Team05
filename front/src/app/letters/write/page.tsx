"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, RefreshCcw, Waves, Loader2 } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import SendingAnimation from "@/components/letters/SendingAnimation";
import { requestData } from "@/lib/api/http-client";
import { toast } from "react-hot-toast";

interface ApiErrorResponse {
  response?: {
    data?: {
      code?: string;
      msg?: string;
    };
  };
}

function resolveErrorMessage(error: unknown): string {
  const apiError = error as ApiErrorResponse;
  const errorData = apiError.response?.data;

  if (errorData) {
    if (errorData.code === "404-2") {
      return "지금은 모든 바닷길이 잠시 닫혀 있네요. (수신 가능한 유저가 없습니다) 잠시 후 다시 편지를 띄워보세요.";
    }
    if (errorData.msg) return errorData.msg;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "편지를 바다로 보내지 못했습니다. 네트워크 연결을 확인해주세요.";
}

export default function WriteLetterPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentDateText = useMemo(
    () =>
      new Date()
        .toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\.$/, ""),
    [],
  );

  const letterLength = title.trim().length + content.trim().length;
  const hasDraft = title.trim().length > 0 || content.trim().length > 0;
  const canSend =
    title.trim().length > 0 && content.trim().length > 0 && !isSending;

  // 1. 페이지 이탈 방지 로직 (새로고침/브라우저 닫기)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDraft && !isSending) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDraft, isSending]);

  function handleGoBack() {
    if (hasDraft && !isSending) {
      if (!window.confirm("작성 중인 내용이 사라집니다. 정말 돌아가시겠어요?"))
        return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/letters/mailbox");
    }
  }

  async function handleSend() {
    if (!canSend || isSending) return;

    setSubmitError(null);
    setIsSending(true);

    try {
      await requestData("/api/v1/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      // 애니메이션 완료 대기 (SendingAnimation이 3.8초 정도 지속된다고 가정)
      setTimeout(() => {
        router.push("/letters/mailbox");
      }, 3800);
    } catch (error: unknown) {
      setIsSending(false);
      const errorMsg = resolveErrorMessage(error);
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    }
  }

  function handleReset() {
    if (!hasDraft) return;
    if (window.confirm("작성 중인 내용을 모두 지울까요?")) {
      setTitle("");
      setContent("");
      setSubmitError(null);
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      {isSending && <SendingAnimation />}

      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-14 pt-7">
        <MainHeader />

        <section className="mx-auto mt-10 w-full max-w-3xl text-center">
          <h1 className="text-[32px] font-bold tracking-tight text-[#1f3150] sm:text-[40px]">
            걱정을 놓아주세요
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[#7a8da9] sm:text-[18px]">
            무거운 마음을 양피지에 적어보세요.{" "}
            <br className="hidden sm:block" />
            준비가 되면 파도가 당신의 고민을 영원히 가져가게 두세요.
          </p>
        </section>

        <section className="mx-auto mt-10 w-full max-w-4xl">
          <div className="mb-6 flex justify-start">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-[#5e7ea5] ring-1 ring-[#d8e7f7] shadow-sm transition hover:bg-white hover:text-[#355b88] active:scale-95"
            >
              <ChevronLeft size={16} />
              돌아가기
            </button>
          </div>

          <div className="relative rounded-[44px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(238,247,255,0.92))] px-4 pb-8 pt-14 shadow-2xl backdrop-blur-sm sm:px-10 sm:pb-12 sm:pt-16">
            <div className="absolute left-1/2 top-0 h-7 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c59f74] shadow-md" />

            <div className="rounded-[34px] border border-[#f3eadb] bg-[#fffdf7] px-6 py-6 shadow-inner sm:px-10 sm:py-10">
              <div className="flex items-center justify-between gap-4 border-b border-[#efe6d5] pb-5">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 50))} // 제목 50자 제한 예시
                  placeholder="바다에게 보내는 편지 제목..."
                  className="w-full bg-transparent text-[16px] italic font-medium text-[#516885] outline-none placeholder:text-[#aebcd2]"
                />
                <span className="shrink-0 text-[13px] font-semibold text-[#bcc8da]">
                  {currentDateText}
                </span>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 2000))} // 내용 2000자 제한 예시
                placeholder="여기에 당신의 걱정을 담아주세요..."
                className="mt-8 h-[400px] w-full resize-none bg-transparent text-[18px] leading-9 tracking-tight text-[#516885] outline-none placeholder:text-[#b8c6d9] sm:h-[500px]"
              />

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#efe6d5] pt-5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#9aaac1] transition hover:text-rose-400"
                >
                  <RefreshCcw size={15} />
                  다시 쓰기
                </button>
                <div className="text-sm font-bold text-[#b2bfd2]">
                  {letterLength.toLocaleString()} 자
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-rose-100 bg-rose-50 px-5 py-3 text-center text-[14px] font-medium text-rose-500 animate-in fade-in slide-in-from-top-1">
              {submitError}
            </div>
          )}

          <div className="mt-10 flex flex-col items-center">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className={`inline-flex min-w-[320px] items-center justify-center gap-3 rounded-full px-8 py-5 text-[20px] font-bold tracking-tight text-white shadow-xl transition-all active:scale-[0.98] ${
                canSend
                  ? "bg-gradient-to-b from-[#49b6f2] to-[#31a7ee] hover:shadow-sky-200/50 hover:brightness-105"
                  : "cursor-not-allowed bg-[#bad4ea] shadow-none"
              }`}
            >
              {isSending ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <Waves size={22} />
              )}
              {isSending ? "병을 닫는 중..." : "병을 닫아 바다로 보내기"}
            </button>
            <p className="mt-6 text-[14px] font-medium text-[#a6b5ca]">
              이 메시지는 보내는 즉시 바다로 흘러가 사라집니다
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
