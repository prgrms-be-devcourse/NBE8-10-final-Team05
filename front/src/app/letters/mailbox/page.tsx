"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Droplets,
  Heart,
  Mail,
  Send,
  Sparkles,
  Settings,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";
import { useAuthStore } from "@/lib/auth/auth-store";

type MailboxTab = "received" | "sent";

interface LetterSummary {
  id: number;
  title: string;
  createdDate: string;
  replied: boolean;
}

interface MailboxStats {
  receivedCount: number;
  latestReceivedLetter?: LetterSummary;
  latestSentLetter?: LetterSummary;
}

interface MemberResponse {
  id: number;
  email: string;
  nickname: string;
  randomReceiveAllowed: boolean;
}

export default function MailboxPage() {
  const { isAuthenticated, sessionRevision } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MailboxTab>("received");
  const [stats, setStats] = useState<MailboxStats | null>(null);

  const [isRandomAllowed, setIsRandomAllowed] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const initData = async () => {
      // 1. 인증되지 않은 경우 상태 초기화 후 중단
      if (!isAuthenticated) {
        setStats(null);
        return;
      }

      try {
        // 2. 통계와 유저 설정 정보를 병렬로 호출
        const [statsRes, memberRes] = await Promise.all([
          requestData<MailboxStats>("/api/v1/letters/stats"),
          requestData<MemberResponse>("/api/v1/members/me"),
        ]);

        // 3. 상태 업데이트
        setStats(statsRes);
        setIsRandomAllowed(memberRes.randomReceiveAllowed);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      }
    };

    void initData();
    // 인증 상태나 세션이 변경될 때마다 다시 실행
  }, [isAuthenticated, sessionRevision]);

  const handleToggleRandom = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // [수정 포인트] requestData<any> 를 requestData<MemberResponse> 로 변경
      const res = await requestData<MemberResponse>(
        "/api/v1/members/me/random-setting",
        {
          method: "PATCH",
        },
      );

      // 이제 res.randomReceiveAllowed가 MemberResponse 타입을 가지므로 안전하게 접근 가능합니다.
      setIsRandomAllowed(res.randomReceiveAllowed);

      alert(
        res.randomReceiveAllowed
          ? "이제 랜덤 편지를 받을 수 있습니다."
          : "랜덤 편지 수신을 거부했습니다.",
      );
    } catch (error) {
      console.error("설정 변경 실패:", error);
      alert("설정 변경 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "기록이 없습니다";
    const now = new Date();
    const past = new Date(dateString);
    if (isNaN(past.getTime())) return "날짜 정보 없음";

    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return "방금 전";
    if (diffInMins < 60) return `${diffInMins}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${diffInDays}일 전`;
  };

  const isReceived = activeTab === "received";

  // 백엔드 필드명에 맞춰 수정
  const currentCount = isReceived ? (stats?.receivedCount ?? 0) : 0; // 보낸 편지 개수는 현재 백엔드 DTO(LettersStatsRes)에 필드가 추가되어야 정확히 표시 가능합니다.

  const currentLatest = isReceived
    ? stats?.latestReceivedLetter
    : stats?.latestSentLetter;

  const currentPath = isReceived
    ? "/letters/mailbox/receive"
    : "/letters/mailbox/sent";

  // 데이터 존재 여부 판단 (개수 혹은 최신 편지 존재 여부)
  const hasLetters = isReceived ? currentCount > 0 : !!stats?.latestSentLetter;

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-12">
        <section className="mb-8 w-full max-w-md">
          <div className="flex items-center justify-between rounded-3xl border border-white/60 bg-white/40 p-5 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isRandomAllowed ? "bg-sky-100 text-sky-500" : "bg-slate-200 text-slate-400"}`}
              >
                <Settings
                  size={20}
                  className={isUpdating ? "animate-spin" : ""}
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-slate-700">
                  랜덤 편지 수신
                </p>
                <p
                  className={`text-xs font-medium ${isRandomAllowed ? "text-sky-500" : "text-slate-400"}`}
                >
                  {isRandomAllowed
                    ? "새로운 인연을 기다리는 중"
                    : "현재 수신을 거부함"}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleRandom}
              disabled={isUpdating}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
                isRandomAllowed ? "bg-sky-400" : "bg-slate-300"
              } ${isUpdating ? "opacity-50" : "hover:scale-105"}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                  isRandomAllowed ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>
        <div className="mb-10 flex items-center justify-center gap-10 border-b border-[#dbe7f7]">
          <button
            onClick={() => setActiveTab("received")}
            className={`-mb-px border-b-2 px-1 pb-3 text-lg font-bold transition-colors ${
              activeTab === "received"
                ? "border-[#78A7E6] text-[#233552]"
                : "border-transparent text-[#6f84a5] hover:text-[#4f6f98]"
            }`}
          >
            받은 편지함
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`-mb-px border-b-2 px-1 pb-3 text-lg font-bold transition-colors ${
              activeTab === "sent"
                ? "border-[#78A7E6] text-[#233552]"
                : "border-transparent text-[#6f84a5] hover:text-[#4f6f98]"
            }`}
          >
            보낸 편지함
          </button>
        </div>

        <section className="mb-16 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col items-center rounded-[3rem] border border-white bg-white/80 p-10 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] backdrop-blur-xl">
            <span className="mb-6 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-400">
              {isReceived
                ? hasLetters
                  ? "따뜻한 연결의 시작"
                  : "고요한 바닷가"
                : "나의 진심을 담은 기록"}
            </span>

            <h2
              className={`mb-2 text-3xl font-bold ${hasLetters ? "text-slate-800" : "text-slate-400"}`}
            >
              {hasLetters
                ? isReceived
                  ? "편지가 도착했습니다"
                  : "파도에 실어 보낸 마음"
                : isReceived
                  ? "오늘의 바다는 고요하네요"
                  : "아직 보낸 편지가 없어요"}
            </h2>

            <p className="mb-10 text-sm leading-relaxed text-slate-500 whitespace-pre-line">
              {isReceived
                ? "누군가의 소중한 진심이 담긴 편지가\n당신의 마음을 두드리고 있어요."
                : "당신이 보낸 편지들이 바다 너머\n누군가에게 따뜻한 위로가 되고 있을 거예요."}
            </p>

            <Link
              href={currentPath}
              className={`group relative mb-10 flex h-32 w-32 items-center justify-center rounded-full transition-all hover:scale-105 ${
                hasLetters ? "bg-sky-50 shadow-inner" : "bg-slate-100"
              }`}
            >
              {hasLetters && (
                <div className="absolute inset-0 rounded-full bg-sky-400/10 opacity-20 animate-ping" />
              )}
              {isReceived ? (
                <Mail
                  size={48}
                  className={`relative z-10 ${hasLetters ? "text-sky-400" : "text-slate-300"}`}
                />
              ) : (
                <Send
                  size={48}
                  className={`relative z-10 ${hasLetters ? "text-sky-400" : "text-slate-300"}`}
                />
              )}
            </Link>

            <Link
              href={currentPath}
              className={`flex items-center gap-2 font-bold transition-all hover:gap-3 ${hasLetters ? "text-sky-500" : "text-slate-400"}`}
            >
              {isReceived ? "편지 열어보기" : "보낸 기록 보기"}
              <ChevronRight size={18} />
            </Link>
          </div>
        </section>

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href={currentPath}
            className="group flex items-center gap-4 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-400 transition-colors group-hover:bg-sky-400 group-hover:text-white">
              <Droplets size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">
                {isReceived ? "최근 받은 편지" : "최근 보낸 편지"}
              </p>
              <p className="font-bold text-slate-700">
                {currentLatest
                  ? getRelativeTime(currentLatest.createdDate)
                  : "기록 없음"}
              </p>
            </div>
          </Link>

          <Link
            href={currentPath}
            className="group flex items-center gap-4 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-400 transition-colors group-hover:bg-rose-400 group-hover:text-white">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">
                {isReceived ? "나의 보관함 (받음)" : "나의 보관함 (보냄)"}
              </p>
              <p className="font-bold text-slate-700">
                {/* 보낸 편지는 개수 필드가 없으므로 '기록 있음' 정도로 표시하거나 DTO 수정을 권장합니다. */}
                {isReceived
                  ? hasLetters
                    ? `총 ${currentCount}통의 진심`
                    : "비어있음"
                  : hasLetters
                    ? "기록 있음"
                    : "비어있음"}
              </p>
            </div>
          </Link>

          <Link
            href="/letters/write"
            className="group flex items-center gap-4 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400 transition-colors group-hover:bg-emerald-400 group-hover:text-white">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">새 편지 쓰기</p>
              <p className="font-bold text-slate-700">마음을 전하세요</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
