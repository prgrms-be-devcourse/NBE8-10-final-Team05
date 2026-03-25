"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Mailbox, RefreshCcw, SendHorizontal, Waves } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { useAuthStore } from "@/lib/auth/auth-store";
import { requestData } from "@/lib/api/http-client";

function SendingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#edf5ff]/90 px-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 12, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        className="home-panel w-full max-w-md rounded-[28px] px-8 py-8 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1ff] text-[#5f95f3]">
          <Waves size={30} />
        </div>
        <h2 className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-[#233552]">
          편지를 띄우는 중...
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6f84a5]">
          마음을 담은 편지가 바다를 건너고 있어요.
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e8f1ff]">
          <motion.div
            className="h-full rounded-full bg-[#5f95f3]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.1, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "편지를 보내지 못했습니다.";
}

export default function WriteLetterPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const diaryHref = isAuthenticated ? "/dashboard" : "/login";

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
  const canSend = title.trim().length > 0 && content.trim().length > 0 && !isSending;

  async function handleSend() {
    if (!canSend) {
      alert("제목과 내용을 모두 채워주세요.");
      return;
    }

    setIsSending(true);

    try {
      await requestData("/api/v1/letters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });

      setTimeout(() => {
        router.push("/letters/mailbox");
      }, 2200);
    } catch (error: unknown) {
      setIsSending(false);
      alert(resolveErrorMessage(error));
    }
  }

  function handleReset() {
    const hasContent = title.trim().length > 0 || content.trim().length > 0;
    if (!hasContent) {
      return;
    }

    if (window.confirm("작성 중인 내용을 모두 지울까요?")) {
      setTitle("");
      setContent("");
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      <AnimatePresence>{isSending ? <SendingOverlay /> : null}</AnimatePresence>

      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="home-hero mt-8 rounded-[36px] px-6 py-9 text-white sm:px-10">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[34px]">비밀 편지 쓰기</h1>
          <p className="mt-2 text-sm leading-6 text-white/88 sm:text-base">
            지금 마음을 솔직하게 적어주세요. 상대에게는 익명으로 전달되고, 당신의 정보는 노출되지 않습니다.
          </p>
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="home-panel rounded-[34px] px-6 py-6 sm:px-7">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e5eefb] pb-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[#89a0c2] uppercase">Today</p>
                <p className="mt-1 text-sm text-[#5f7599]">{currentDateText}</p>
              </div>
              <p className="text-xs text-[#8ca1c0]">전송 후에는 내용을 수정할 수 없어요.</p>
            </div>

            <label className="mt-6 block text-xs font-semibold tracking-[0.08em] text-[#89a0c2] uppercase">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 요즘 마음이 너무 복잡해요"
              className="mt-2 w-full rounded-[16px] border border-[#d8e6fb] bg-[#fbfdff] px-4 py-3 text-[17px] text-[#2b4162] outline-none transition focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
            />

            <label className="mt-5 block text-xs font-semibold tracking-[0.08em] text-[#89a0c2] uppercase">
              내용
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="오늘 있었던 일, 감정, 원하는 조언을 자유롭게 적어주세요."
              className="mt-2 h-[300px] w-full resize-y rounded-[20px] border border-[#d8e6fb] bg-[#fbfdff] px-4 py-3 text-[15px] leading-7 text-[#2b4162] outline-none transition placeholder:text-[#9ab0cc] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20 sm:h-[340px]"
            />

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#8ca1c0]">
              <p>현재 글자 수 {letterLength}자</p>
              <p>따뜻한 설명이 있으면 답장을 받기 쉬워요.</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-full border border-[#d8e6fb] bg-white px-4 py-2 text-sm font-semibold text-[#506582] transition hover:border-[#bfd3f6] hover:text-[#2f4b73]"
              >
                <RefreshCcw size={16} />
                초기화
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition ${
                  canSend ? "bg-[#5f95f3] hover:bg-[#4a82e5]" : "cursor-not-allowed bg-[#b7c9e7]"
                }`}
              >
                <SendHorizontal size={16} />
                {isSending ? "전송 중..." : "편지 보내기"}
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="home-panel rounded-[28px] px-5 py-5">
              <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#233552]">작성 가이드</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6f84a5]">
                <li>1. 상황과 감정을 함께 적으면 공감받기 쉬워요.</li>
                <li>2. 상대는 익명으로 답장을 보내며, 개인정보는 노출되지 않아요.</li>
                <li>3. 비방/개인정보 포함 문장은 AI 검열로 제한될 수 있어요.</li>
              </ul>
            </section>

            <section className="home-panel rounded-[28px] px-5 py-5">
              <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#233552]">빠른 이동</h2>
              <div className="mt-4 space-y-3">
                <Link
                  href="/letters/mailbox"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#dce9ff] px-4 py-2 text-sm font-semibold text-[#5279b7] transition hover:bg-[#cfe1ff]"
                >
                  <Mailbox size={16} />
                  편지함 보기
                </Link>
                <Link
                  href={diaryHref}
                  className="inline-flex w-full items-center justify-center rounded-full border border-[#d8e6fb] bg-white px-4 py-2 text-sm font-semibold text-[#506582] transition hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                >
                  {isAuthenticated ? "내 상태 확인하기" : "로그인하고 내 상태 보기"}
                </Link>
              </div>
            </section>
          </aside>
        </section>

      </div>
    </div>
  );
}
