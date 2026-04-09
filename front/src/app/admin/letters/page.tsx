"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookHeart,
  ChevronRight,
  Clock3,
  MailCheck,
  MailOpen,
  PenSquare,
} from "lucide-react";
import {
  formatAdminLetterDateTime,
  formatAdminLetterMemberName,
  formatAdminLetterStatusLabel,
  sortAdminLettersByCreatedAtDesc,
} from "@/lib/admin/admin-letter-presenter";
import { getAdminLetters } from "@/lib/admin/admin-letter-service";
import type {
  AdminLetterListItem,
  AdminLetterStatus,
} from "@/lib/admin/admin-letter-types";
import { toErrorMessage } from "@/lib/api/rs-data";

const LETTER_FILTERS = ["전체", "SENT", "ACCEPTED", "WRITING", "REPLIED"] as const;

type LetterFilter = (typeof LETTER_FILTERS)[number];

function getStatusTone(status: AdminLetterStatus): string {
  if (status === "REPLIED") {
    return "bg-[#eef7ef] text-[#457650]";
  }

  if (status === "WRITING") {
    return "bg-[#fff6eb] text-[#c8892d]";
  }

  if (status === "ACCEPTED") {
    return "bg-[#eff5ff] text-[#4f6fa8]";
  }

  if (status === "UNASSIGNED") {
    return "bg-[#fff2f2] text-[#c96f6f]";
  }

  return "bg-[#eefbf4] text-[#37a264]";
}

export default function AdminLettersPage() {
  const [letters, setLetters] = useState<AdminLetterListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<LetterFilter>("전체");

  useEffect(() => {
    let cancelled = false;

    async function fetchLetters(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getAdminLetters();
        if (!cancelled) {
          setLetters(sortAdminLettersByCreatedAtDesc(data));
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setLetters([]);
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchLetters();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleLetters = useMemo(() => {
    if (activeFilter === "전체") {
      return letters;
    }

    return letters.filter((letter) => letter.status === activeFilter);
  }, [activeFilter, letters]);

  const summaryCards = useMemo(() => {
    const pendingCount = letters.filter(
      (letter) => letter.status === "SENT" || letter.status === "ACCEPTED",
    ).length;
    const writingCount = letters.filter((letter) => letter.status === "WRITING").length;
    const repliedCount = letters.filter((letter) => letter.status === "REPLIED").length;
    const todayCount = letters.filter((letter) => isSameDay(letter.createdAt, new Date())).length;

    return [
      {
        label: "전체 편지",
        value: letters.length,
        helper: "누적 생성 편지",
        icon: BookHeart,
        iconTone: "bg-[#edf5ff] text-[#4f8cf0]",
      },
      {
        label: "답장 대기",
        value: pendingCount,
        helper: "읽음 포함 미응답",
        icon: Clock3,
        iconTone: "bg-[#eefbf4] text-[#37a264]",
      },
      {
        label: "작성 중",
        value: writingCount,
        helper: "실시간 작성 감지",
        icon: PenSquare,
        iconTone: "bg-[#fff6eb] text-[#c8892d]",
      },
      {
        label: "오늘 생성",
        value: todayCount,
        helper: repliedCount > 0 ? `답장 완료 ${repliedCount}건` : "답장 완료 없음",
        icon: MailCheck,
        iconTone: "bg-[#fff2f2] text-[#d66f7d]",
      },
    ];
  }, [letters]);

  const statusBreakdown = useMemo(
    () =>
      (["SENT", "ACCEPTED", "WRITING", "REPLIED"] as const).map((status) => ({
        status,
        label: formatAdminLetterStatusLabel(status),
        count: letters.filter((letter) => letter.status === status).length,
      })),
    [letters],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Admin Letters
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#223552]">
              비밀편지 관리
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[#6e83a5]">
              발신부터 답장 완료까지 현재 편지 흐름을 운영 화면에서 확인합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {LETTER_FILTERS.map((filter) => {
              const active = filter === activeFilter;
              const label = filter === "전체" ? filter : formatAdminLetterStatusLabel(filter);

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[#4f8cf0] text-white"
                      : "bg-white text-[#6680a5] ring-1 ring-[#d9e6f7] hover:text-[#35527e]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.label}
              label={card.label}
              value={card.value}
              helper={card.helper}
              icon={card.icon}
              iconTone={card.iconTone}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
        <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
                최근 편지 목록
              </h2>
              <p className="mt-2 text-sm text-[#89a0c1]">
                선택한 상태 기준으로 최신 편지부터 정렬됩니다.
              </p>
            </div>
            <div className="rounded-full bg-[#eff5ff] px-4 py-2 text-sm font-semibold text-[#5f7ca8]">
              총 {visibleLetters.length}건
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 rounded-[24px] bg-[#f7fbff] px-6 py-14 text-center text-[#5f7598]">
              비밀편지 목록을 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="mt-6 rounded-[24px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-12 text-center text-[#9a4b4b]">
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && visibleLetters.length === 0 ? (
            <div className="mt-6 rounded-[24px] bg-[#f7fbff] px-6 py-14 text-center text-[#5f7598]">
              현재 조건에 맞는 비밀편지가 없습니다.
            </div>
          ) : null}

          {!isLoading && !errorMessage && visibleLetters.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e6eef9]">
              <div className="hidden grid-cols-[100px_minmax(0,1.4fr)_150px_150px_130px_180px_180px_28px] items-center gap-4 bg-[#f7fbff] px-6 py-4 text-sm font-semibold text-[#6d82a5] lg:grid">
                <span>ID</span>
                <span>제목</span>
                <span>발신자</span>
                <span>수신자</span>
                <span>상태</span>
                <span>생성일</span>
                <span>답장일</span>
                <span />
              </div>

              <div className="divide-y divide-[#edf3fe]">
                {visibleLetters.map((letter) => (
                  <Link
                    key={letter.letterId}
                    href={`/admin/letters/${letter.letterId}`}
                    className="block px-6 py-5 transition hover:bg-[#f9fbff]"
                  >
                    <div className="hidden grid-cols-[100px_minmax(0,1.4fr)_150px_150px_130px_180px_180px_28px] items-center gap-4 lg:grid">
                      <span className="font-semibold text-[#29405f]">#{letter.letterId}</span>
                      <span className="truncate text-[#314969]">{letter.title}</span>
                      <span className="truncate text-[#516885]">
                        {formatAdminLetterMemberName(letter.senderNickname)}
                      </span>
                      <span className="truncate text-[#516885]">
                        {formatAdminLetterMemberName(letter.receiverNickname)}
                      </span>
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(letter.status)}`}
                      >
                        {formatAdminLetterStatusLabel(letter.status)}
                      </span>
                      <span className="text-sm text-[#6b81a2]">
                        {formatAdminLetterDateTime(letter.createdAt)}
                      </span>
                      <span className="text-sm text-[#6b81a2]">
                        {formatAdminLetterDateTime(letter.replyCreatedAt)}
                      </span>
                      <span className="text-[#9ab1d4]">
                        <ChevronRight size={18} />
                      </span>
                    </div>

                    <div className="space-y-3 lg:hidden">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[#29405f]">#{letter.letterId}</span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(letter.status)}`}
                        >
                          {formatAdminLetterStatusLabel(letter.status)}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-[#314969]">{letter.title}</p>
                      <div className="grid gap-2 text-sm text-[#526987] sm:grid-cols-2">
                        <p>발신자 {formatAdminLetterMemberName(letter.senderNickname)}</p>
                        <p>수신자 {formatAdminLetterMemberName(letter.receiverNickname)}</p>
                        <p>생성 {formatAdminLetterDateTime(letter.createdAt)}</p>
                        <p>답장 {formatAdminLetterDateTime(letter.replyCreatedAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
            상태별 분포
          </h2>
          <p className="mt-2 text-sm text-[#89a0c1]">
            현재 답장 흐름이 어느 단계에 몰려 있는지 확인합니다.
          </p>

          <div className="mt-6 space-y-3">
            {statusBreakdown.map((item) => (
              <div
                key={item.status}
                className="rounded-[22px] bg-[#f7fbff] px-4 py-4 shadow-[0_20px_36px_-40px_rgba(77,119,176,0.45)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${getStatusTone(item.status)}`}
                    >
                      {item.status === "REPLIED" ? (
                        <MailCheck size={18} />
                      ) : item.status === "WRITING" ? (
                        <PenSquare size={18} />
                      ) : item.status === "ACCEPTED" ? (
                        <MailOpen size={18} />
                      ) : (
                        <Clock3 size={18} />
                      )}
                    </div>
                    <span className="font-semibold text-[#314969]">{item.label}</span>
                  </div>
                  <span className="text-[22px] font-semibold tracking-[-0.04em] text-[#223552]">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  iconTone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof BookHeart;
  iconTone: string;
}) {
  return (
    <div className="rounded-[28px] bg-white px-6 py-6 shadow-[0_26px_52px_-44px_rgba(77,119,176,0.45)]">
      <div className="flex items-center justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconTone}`}>
          <Icon size={22} />
        </div>
        <span className="rounded-full bg-[#f4f8ff] px-3 py-1 text-xs font-semibold text-[#89a0c1]">
          {helper}
        </span>
      </div>
      <p className="mt-6 text-sm font-semibold text-[#7e94b5]">{label}</p>
      <p className="mt-2 text-[38px] font-semibold tracking-[-0.04em] text-[#223552]">{value}</p>
    </div>
  );
}

function isSameDay(value: string, now: Date): boolean {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return (
    parsed.getFullYear() === now.getFullYear()
    && parsed.getMonth() === now.getMonth()
    && parsed.getDate() === now.getDate()
  );
}
