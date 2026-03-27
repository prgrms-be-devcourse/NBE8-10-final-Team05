"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, RefreshCcw, Waves } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import SendingAnimation from "@/components/letters/SendingAnimation";
import { requestData } from "@/lib/api/http-client";

function resolveErrorMessage(error: any): string {
  // 1. 서버 응답 객체(RsData) 내의 구체적인 에러 코드/메시지 확인
  const errorData = error.response?.data;

  if (errorData) {
    // 수신 가능한 유저가 없는 경우 (404-2)
    if (errorData.code === "404-2") {
      return "지금은 모든 바닷길이 잠시 닫혀 있네요. (수신 가능한 유저가 없습니다) 잠시 후 다시 편지를 띄워보세요.";
    }
    // AI 검수 통과 실패 등 기타 서버 정의 메시지
    if (errorData.msg) {
      return errorData.msg;
    }
  }

  // 2. 일반적인 에러 메시지 처리
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

  function handleGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/letters/mailbox");
  }

  async function handleSend() {
    if (!canSend) {
      setSubmitError("제목과 내용을 모두 채워주세요.");
      return;
    }

    setSubmitError(null);
    setIsSending(true);

    try {
      // requestData 내부에서 에러 발생 시 throw 되도록 구현되어 있어야 합니다.
      await requestData("/api/v1/letters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });

      // 성공 시 애니메이션을 보여주기 위해 약간의 지연 후 이동
      setTimeout(() => {
        router.push("/letters/mailbox");
      }, 3800);
    } catch (error: unknown) {
      // 에러 발생 시 전송 중 상태를 해제하고 사용자에게 에러 노출
      setIsSending(false);
      setSubmitError(resolveErrorMessage(error));

      // 사용자 경험을 위해 에러 발생 시 화면 상단으로 스크롤 (선택 사항)
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleReset() {
    if (!hasDraft) {
      return;
    }

    if (window.confirm("작성 중인 내용을 모두 지울까요?")) {
      setTitle("");
      setContent("");
      setSubmitError(null);
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      {isSending ? <SendingAnimation /> : null}

      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-14 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-3xl text-center">
          <h1 className="text-[34px] font-semibold tracking-[-0.05em] text-[#1f3150] sm:text-[40px]">
            걱정을 놓아주세요
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-[#7a8da9] sm:text-[17px]">
            <span className="block">무거운 마음을 양피지에 적어보세요.</span>
            <span className="block">
              준비가 되면, 파도가 당신의 고민을 영원히 가져가게 두세요.
            </span>
          </p>
        </section>

        <section className="mx-auto mt-10 w-full max-w-4xl">
          <div className="mb-5 flex justify-start">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 rounded-full bg-white/78 px-4 py-2 text-sm font-semibold text-[#5e7ea5] ring-1 ring-[#d8e7f7] shadow-[0_18px_34px_-28px_rgba(96,138,190,0.72)] transition hover:bg-white hover:text-[#355b88]"
            >
              <ChevronLeft size={16} />
              돌아가기
            </button>
          </div>

          <div className="relative rounded-[44px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(238,247,255,0.92))] px-4 pb-8 pt-14 shadow-[0_36px_90px_-54px_rgba(92,139,203,0.52)] sm:px-8 sm:pb-10 sm:pt-16">
            <div className="absolute left-1/2 top-0 h-7 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c59f74] shadow-[0_10px_18px_-14px_rgba(88,61,34,0.7)]" />

            <div className="rounded-[34px] border border-[#f3eadb] bg-[#fffdf7] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_60px_-48px_rgba(125,150,188,0.68)] sm:px-8 sm:py-8">
              <label htmlFor="letter-title" className="sr-only">
                편지 제목
              </label>
              <div className="flex items-center justify-between gap-4 border-b border-[#efe6d5] pb-4">
                <input
                  id="letter-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="바다에게 보내는 편지..."
                  className="w-full bg-transparent text-[15px] italic text-[#7d92b2] outline-none placeholder:text-[#aebcd2]"
                />
                <span className="shrink-0 text-[13px] font-medium text-[#bcc8da]">
                  {currentDateText}
                </span>
              </div>

              <label htmlFor="letter-content" className="sr-only">
                편지 내용
              </label>
              <textarea
                id="letter-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="여기에 당신의 걱정을 담아주세요..."
                className="mt-6 h-[420px] w-full resize-none bg-transparent text-[18px] leading-9 tracking-[-0.02em] text-[#516885] outline-none placeholder:text-[#b8c6d9] sm:h-[520px]"
              />

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#efe6d5] pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#9aaac1] transition hover:text-[#6f84a5]"
                >
                  <RefreshCcw size={15} />
                  다시 쓰기
                </button>
                <div className="text-sm font-medium text-[#b2bfd2]">
                  {letterLength}자
                </div>
              </div>
            </div>
          </div>

          {submitError ? (
            <div className="mx-auto mt-5 max-w-2xl rounded-[18px] border border-[#ffd7d7] bg-[#fff5f5] px-4 py-3 text-center text-sm text-[#c24a4a]">
              {submitError}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col items-center">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className={`inline-flex min-w-[320px] items-center justify-center gap-2 rounded-full px-8 py-4 text-[20px] font-semibold tracking-[-0.03em] text-white shadow-[0_24px_46px_-28px_rgba(52,152,219,0.76)] transition ${
                canSend
                  ? "bg-[linear-gradient(180deg,#49b6f2,#31a7ee)] hover:translate-y-[-1px] hover:brightness-[1.02]"
                  : "cursor-not-allowed bg-[#bad4ea] shadow-none"
              }`}
            >
              <Waves size={20} />
              {isSending ? "병을 닫는 중..." : "병을 닫아 바다로 보내기"}
            </button>
            <p className="mt-5 text-[13px] text-[#a6b5ca]">
              이 메시지는 보내는 즉시 바다로 흘러가 사라집니다
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
