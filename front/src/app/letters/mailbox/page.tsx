"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ChevronRight,
  Droplets,
  Heart,
  Mail,
  Send,
  Sparkles,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const statsRes = await requestData<MailboxStats>("/api/v1/letters/stats");
      setStats(statsRes);
    } catch {
      console.error("통계 데이터 로딩 실패");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const initData = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const [statsRes, memberRes] = await Promise.all([
          requestData<MailboxStats>("/api/v1/letters/stats"),
          requestData<MemberResponse>("/api/v1/members/me"),
        ]);
        setStats(statsRes);
        setIsRandomAllowed(memberRes.randomReceiveAllowed);
      } catch {
        console.error("초기 데이터 로딩 실패");
      } finally {
        setIsLoading(false);
      }
    };
    void initData();
  }, [isAuthenticated, sessionRevision]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUpdate = () => {
      console.log("🔄 실시간 알림 수신: 통계 수치 갱신 중...");
      void fetchStats();
    };

    window.addEventListener("notification_received", handleUpdate);
    return () => {
      window.removeEventListener("notification_received", handleUpdate);
    };
  }, [isAuthenticated, fetchStats]);

  const handleToggleRandom = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await requestData<MemberResponse>(
        "/api/v1/members/me/random-setting",
        { method: "PATCH" },
      );
      setIsRandomAllowed(res.randomReceiveAllowed);
      toast.success(
        res.randomReceiveAllowed
          ? "랜덤 편지 수신이 활성화되었습니다!"
          : "랜덤 편지 수신을 껐습니다.",
      );
    } catch {
      toast.error("설정 변경에 실패했습니다.");
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
  const currentCount = isReceived ? (stats?.receivedCount ?? 0) : 0;
  const currentLatest = isReceived
    ? stats?.latestReceivedLetter
    : stats?.latestSentLetter;
  const currentPath = isReceived
    ? "/letters/mailbox/receive"
    : "/letters/mailbox/sent";

  const hasLetters = isReceived ? currentCount > 0 : !!stats?.latestSentLetter;

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 pb-10">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-12">
        <section className="mb-8 w-full max-w-md">
          <div className="flex items-center justify-between rounded-3xl border border-white/60 bg-white/40 p-5 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                  isRandomAllowed
                    ? "bg-sky-100 text-sky-500"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {isUpdating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Settings size={20} />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-slate-700">
                  랜덤 편지 수신
                </p>
                <p
                  className={`text-xs font-medium transition-colors ${
                    isRandomAllowed ? "text-sky-500" : "text-slate-400"
                  }`}
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
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                  isRandomAllowed ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>

        <div className="mb-10 flex items-center justify-center gap-10 border-b border-[#dbe7f7] w-full max-w-md">
          {["received", "sent"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as MailboxTab)}
              className={`-mb-px border-b-2 px-1 pb-3 text-lg font-bold transition-all ${
                activeTab === tab
                  ? "border-sky-400 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab === "received" ? "받은 편지함" : "보낸 편지함"}
            </button>
          ))}
        </div>

        <section className="mb-16 w-full max-w-md">
          <div className="flex flex-col items-center rounded-[3rem] border border-white bg-white/80 p-10 text-center shadow-xl backdrop-blur-xl min-h-[480px] justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={40} className="animate-spin text-sky-300" />
                <p className="text-slate-400 text-sm">소식을 불러오는 중...</p>
              </div>
            ) : (
              <>
                <span className="mb-6 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-400">
                  {isReceived
                    ? hasLetters
                      ? "따뜻한 연결의 시작"
                      : "고요한 바닷가"
                    : "나의 진심을 담은 기록"}
                </span>

                <h2
                  className={`mb-2 text-3xl font-bold transition-colors ${
                    hasLetters ? "text-slate-800" : "text-slate-400"
                  }`}
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
                  className={`group relative mb-10 flex h-32 w-32 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${
                    hasLetters
                      ? "bg-sky-50 shadow-inner"
                      : "bg-slate-100 shadow-none"
                  }`}
                >
                  {/* 동그라미 두근거림 효과(animate-ping) 제거 */}
                  {isReceived ? (
                    <Mail
                      size={48}
                      className={`relative z-10 transition-colors ${
                        hasLetters ? "text-sky-400" : "text-slate-300"
                      }`}
                    />
                  ) : (
                    <Send
                      size={48}
                      className={`relative z-10 transition-colors ${
                        hasLetters ? "text-sky-400" : "text-slate-300"
                      }`}
                    />
                  )}
                </Link>

                <Link
                  href={currentPath}
                  className={`flex items-center gap-2 font-bold transition-all hover:gap-3 ${
                    hasLetters ? "text-sky-500" : "text-slate-400"
                  }`}
                >
                  {isReceived ? "편지 열어보기" : "보낸 기록 보기"}
                  <ChevronRight size={18} />
                </Link>
              </>
            )}
          </div>
        </section>

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          <InfoCard
            href={currentPath}
            icon={<Droplets size={24} />}
            label={isReceived ? "최근 받은 편지" : "최근 보낸 편지"}
            value={
              currentLatest
                ? getRelativeTime(currentLatest.createdDate)
                : "기록 없음"
            }
            color="sky"
          />
          <InfoCard
            href={currentPath}
            icon={<Heart size={24} />}
            label={isReceived ? "받은 편지함" : "보낸 편지함"}
            value={
              isReceived
                ? hasLetters
                  ? `총 ${currentCount}통의 편지`
                  : "비어있음"
                : hasLetters
                  ? "보낸 기록 있음"
                  : "비어있음"
            }
            color="rose"
          />
          <InfoCard
            href="/letters/write"
            icon={<Sparkles size={24} />}
            label="새 편지 쓰기"
            value="마음을 전하세요"
            color="emerald"
          />
        </div>
      </main>
    </div>
  );
}

function InfoCard({
  href,
  icon,
  label,
  value,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "sky" | "rose" | "emerald";
}) {
  const colors = {
    sky: "bg-sky-50 text-sky-400 group-hover:bg-sky-400",
    rose: "bg-rose-50 text-rose-400 group-hover:bg-rose-400",
    emerald: "bg-emerald-50 text-emerald-400 group-hover:bg-emerald-400",
  };

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md active:scale-95"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors group-hover:text-white ${colors[color]}`}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <p className="font-bold text-slate-700">{value}</p>
      </div>
    </Link>
  );
}
