"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion"; // AnimatePresence 추가
import {
  History,
  Settings,
  Bold,
  Italic,
  Eraser,
  Waves,
  Wind,
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";
import { useRouter } from "next/navigation";

// --- 1. 애니메이션 컴포넌트 추가 ---
function SendingAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-sky-100 flex flex-col items-center justify-center overflow-hidden"
    >
      <motion.div
        animate={{ x: [-20, 20, -20] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 right-0 text-sky-200/50"
      >
        <Waves size={1200} strokeWidth={1} />
      </motion.div>

      <div className="relative flex flex-col items-center">
        <motion.div
          animate={{
            y: [0, -15, 0],
            rotate: [0, 5, -5, 0],
            x: [0, 100, 400, 1200], // 오른쪽 멀리 사라짐
          }}
          transition={{
            y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            x: { duration: 4, ease: "easeIn" },
          }}
          className="relative z-10"
        >
          <div className="relative w-24 h-36 bg-white/30 backdrop-blur-md rounded-b-full rounded-t-3xl border-2 border-white/50 flex flex-col items-center justify-center shadow-2xl">
            <div className="absolute -top-4 w-8 h-6 bg-white/40 border-2 border-white/50 rounded-t-lg" />
            <div className="w-10 h-14 bg-amber-50 rounded-sm border border-amber-200 shadow-sm flex flex-col gap-1 p-1.5">
              <div className="w-full h-1 bg-amber-200" />
              <div className="w-4/5 h-1 bg-amber-200" />
              <div className="w-full h-1 bg-amber-200" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 text-center"
        >
          <h3 className="text-2xl font-bold text-sky-900 mb-2">
            마음을 담아 보내는 중...
          </h3>
          <p className="text-sky-600 font-medium">
            당신의 걱정은 파도가 가져갈 거예요.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function WriteLetterPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const today = new Date()
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\.$/, "");

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 채워주세요.");
      return;
    }

    setIsSending(true); // 애니메이션 시작!

    try {
      // 1. API 전송
      await requestData("/api/v1/letters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          content: content,
        }),
      });

      // 2. 애니메이션이 충분히 보일 수 있도록 3.5초 정도 대기 후 이동
      setTimeout(() => {
        router.push("/letters/mailbox"); // 편지함 목록으로 이동
      }, 4000);
    } catch (error: any) {
      setIsSending(false); // 에러 발생 시 애니메이션 중단
      alert(error.message || "편지를 보내지 못했습니다.");
    }
  };

  const handleReset = () => {
    if (confirm("작성 중인 내용을 모두 지울까요?")) {
      setTitle("");
      setContent("");
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 text-sky-900 flex flex-col font-sans selection:bg-sky-200 relative">
      {/* --- 애니메이션 오버레이 --- */}
      <AnimatePresence>
        {isSending && <SendingAnimation key="sending" />}
      </AnimatePresence>

      {/* 1. Header */}
      <header className="flex items-center justify-between p-6">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push("/")}
        >
          {/* 이미지는 /public/logo.png가 있어야 나옵니다 */}
          <div className="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center text-white">
            <Waves size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">마음온</h1>
        </div>
        <div className="flex items-center gap-5 text-sky-700/70">
          <button className="hover:text-sky-900 transition-colors">
            <History size={24} />
          </button>
          <button className="hover:text-sky-900 transition-colors">
            <Settings size={24} />
          </button>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-10">
        <section className="text-center mb-10">
          <h2 className="text-4xl font-bold text-slate-800 mb-3">
            걱정을 놓아주세요
          </h2>
          <p className="text-slate-600 text-lg">
            무거운 마음을 양피지에 적어보세요.
            <br />
            준비가 되면, 파도가 당신의 고민을 영원히 가져가게 두세요.
          </p>
        </section>

        {/* 3. Letter Card */}
        <div className="relative w-full max-w-2xl bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(186,215,233,0.5)] border border-white/40">
          <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-12 h-6 bg-[#C6A487] rounded-full shadow-md z-10"></div>

          <div className="flex flex-col gap-4 mb-6 border-b border-slate-100 pb-6">
            <div className="flex justify-between items-center text-slate-400 text-sm font-medium italic">
              <span>바다에게 보내는 편지...</span>
              <span>{today}</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full bg-transparent border-none focus:ring-0 text-2xl font-bold text-slate-800 placeholder:text-slate-200 p-0"
            />
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="여기에 당신의 고민을 솔직하게 담아주세요..."
            className="w-full h-[350px] bg-transparent text-slate-700 text-lg leading-relaxed resize-none border-none focus:ring-0 placeholder:text-slate-200 font-serif"
          />

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50 text-slate-300">
            <div className="flex items-center gap-5">
              <Bold size={20} className="hover:text-slate-500 cursor-pointer" />
              <Italic
                size={20}
                className="hover:text-slate-500 cursor-pointer"
              />
            </div>
            <button
              onClick={handleReset}
              className="hover:text-rose-400 transition-colors"
            >
              <Eraser size={20} />
            </button>
          </div>
        </div>

        {/* 5. Send Button */}
        <button
          onClick={handleSend}
          disabled={isSending}
          className={`mt-12 flex items-center gap-3 px-12 py-5 rounded-full text-xl font-bold shadow-lg transition-all transform hover:-translate-y-1 active:scale-95 ${
            isSending
              ? "bg-slate-300 cursor-not-allowed opacity-50"
              : "bg-sky-400 text-white hover:bg-sky-500 shadow-sky-200"
          }`}
        >
          {isSending ? (
            <span className="animate-pulse">편지를 띄우는 중...</span>
          ) : (
            <>
              <Waves size={24} />
              병을 담아 바다로 보내기
            </>
          )}
        </button>
      </main>

      {/* ... Footer 생략 (동일) ... */}
    </div>
  );
}
