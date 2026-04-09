"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  formatAdminLetterActionLabel,
  formatAdminLetterDateTime,
  formatAdminLetterMemberName,
  formatAdminLetterStatusLabel,
} from "@/lib/admin/admin-letter-presenter";
import { getAdminLetters } from "@/lib/admin/admin-letter-service";
import type { AdminLetterListRes, AdminLetterStatus } from "@/lib/admin/admin-letter-types";
import { toErrorMessage } from "@/lib/api/rs-data";

const PAGE_SIZE = 20;
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

const EMPTY_RESULT: AdminLetterListRes = {
  letters: [],
  totalPages: 0,
  totalElements: 0,
  currentPage: 0,
  isFirst: true,
  isLast: true,
};

export default function AdminLettersPage() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<LetterFilter>("전체");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminLetterListRes>(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLetters(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getAdminLetters({
          status: activeFilter === "전체" ? undefined : activeFilter,
          query,
          page,
          size: PAGE_SIZE,
        });
        if (!cancelled) {
          setResult(data);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setResult(EMPTY_RESULT);
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
  }, [activeFilter, page, query]);

  const currentFilterLabel = useMemo(
    () => (activeFilter === "전체" ? "전체 상태" : formatAdminLetterStatusLabel(activeFilter)),
    [activeFilter],
  );

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setQuery(queryInput.trim());
  }

  function handleFilterChange(filter: LetterFilter) {
    setActiveFilter(filter);
    setPage(0);
  }

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
              검색, 상태 필터, 페이지네이션으로 운영 대상 편지를 빠르게 찾고 바로 상세 조치로
              이동합니다.
            </p>
          </div>

          <div className="rounded-[24px] bg-white px-5 py-4 text-right shadow-[0_22px_44px_-40px_rgba(77,119,176,0.45)]">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#89a0c1] uppercase">
              Result
            </p>
            <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#223552]">
              {result.totalElements}
            </p>
            <p className="mt-1 text-sm text-[#6e83a5]">{currentFilterLabel}</p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex items-center gap-3 rounded-[22px] border border-[#dbe7f6] bg-white px-4 py-3 text-[#8ca2c1] shadow-[0_18px_36px_-30px_rgba(100,140,196,0.35)]">
            <Search size={18} />
            <input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="제목, 원문, 발신자, 수신자 닉네임으로 검색"
              className="w-full bg-transparent text-sm text-[#2b4162] outline-none placeholder:text-[#9aaec9]"
            />
          </label>
          <button
            type="submit"
            className="rounded-[22px] bg-[#4f8cf0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f80eb]"
          >
            검색 적용
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {LETTER_FILTERS.map((filter) => {
            const active = filter === activeFilter;
            const label = filter === "전체" ? filter : formatAdminLetterStatusLabel(filter);

            return (
              <button
                key={filter}
                type="button"
                onClick={() => handleFilterChange(filter)}
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
      </section>

      <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#223552]">
              운영 대상 목록
            </h2>
            <p className="mt-2 text-sm text-[#89a0c1]">
              총 {result.totalElements}건 중 {result.currentPage + 1}페이지를 보고 있습니다.
            </p>
          </div>
          <div className="rounded-full bg-[#eff5ff] px-4 py-2 text-sm font-semibold text-[#5f7ca8]">
            페이지 크기 {PAGE_SIZE}
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

        {!isLoading && !errorMessage && result.letters.length === 0 ? (
          <div className="mt-6 rounded-[24px] bg-[#f7fbff] px-6 py-14 text-center text-[#5f7598]">
            조건에 맞는 비밀편지가 없습니다.
          </div>
        ) : null}

        {!isLoading && !errorMessage && result.letters.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e6eef9]">
            <div className="hidden grid-cols-[90px_minmax(0,1.4fr)_140px_140px_120px_140px_170px_170px_28px] items-center gap-4 bg-[#f7fbff] px-6 py-4 text-sm font-semibold text-[#6d82a5] lg:grid">
              <span>ID</span>
              <span>제목</span>
              <span>발신자</span>
              <span>수신자</span>
              <span>상태</span>
              <span>최근 조치</span>
              <span>생성일</span>
              <span>답장일</span>
              <span />
            </div>

            <div className="divide-y divide-[#edf3fe]">
              {result.letters.map((letter) => (
                <Link
                  key={letter.letterId}
                  href={`/admin/letters/${letter.letterId}`}
                  className="block px-6 py-5 transition hover:bg-[#f9fbff]"
                >
                  <div className="hidden grid-cols-[90px_minmax(0,1.4fr)_140px_140px_120px_140px_170px_170px_28px] items-center gap-4 lg:grid">
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
                    <span className="text-sm text-[#516885]">
                      {formatAdminLetterActionLabel(letter.latestAction)}
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
                      <p>최근 조치 {formatAdminLetterActionLabel(letter.latestAction)}</p>
                      <p>생성 {formatAdminLetterDateTime(letter.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {!isLoading && !errorMessage && result.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={result.isFirst}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                result.isFirst
                  ? "cursor-not-allowed bg-[#f1f5fb] text-[#a0b0c8]"
                  : "bg-[#eff5ff] text-[#4f70a6] hover:bg-[#e4efff]"
              }`}
            >
              <ChevronLeft size={16} />
              이전
            </button>
            <p className="text-sm font-semibold text-[#5f7ca8]">
              {result.currentPage + 1} / {result.totalPages}
            </p>
            <button
              type="button"
              disabled={result.isLast}
              onClick={() => setPage((prev) => prev + 1)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                result.isLast
                  ? "cursor-not-allowed bg-[#f1f5fb] text-[#a0b0c8]"
                  : "bg-[#eff5ff] text-[#4f70a6] hover:bg-[#e4efff]"
              }`}
            >
              다음
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
