"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookHeart, ChevronLeft, MailCheck, PenSquare, UserRound } from "lucide-react";
import {
  formatAdminLetterDateTime,
  formatAdminLetterMemberLabel,
  formatAdminLetterStatusLabel,
} from "@/lib/admin/admin-letter-presenter";
import { getAdminLetterDetail } from "@/lib/admin/admin-letter-service";
import type { AdminLetterDetail, AdminLetterStatus } from "@/lib/admin/admin-letter-types";
import { toErrorMessage } from "@/lib/api/rs-data";

function parseLetterId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

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

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim().length);
}

export default function AdminLetterDetailPage() {
  const params = useParams();
  const letterId = useMemo(() => parseLetterId(params.id), [params.id]);

  const [letter, setLetter] = useState<AdminLetterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLetter(id: number): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getAdminLetterDetail(id);
        if (!cancelled) {
          setLetter(data);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setLetter(null);
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (letterId === null) {
      setLetter(null);
      setErrorMessage("잘못된 비밀편지 상세 경로입니다.");
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void fetchLetter(letterId);

    return () => {
      cancelled = true;
    };
  }, [letterId]);

  if (isLoading) {
    return (
      <div className="rounded-[28px] bg-white px-6 py-14 text-center text-[#5f7598] shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        비밀편지 상세를 불러오는 중입니다.
      </div>
    );
  }

  if (errorMessage || !letter) {
    return (
      <div className="rounded-[28px] border border-[#f3d0d0] bg-white px-6 py-12 text-center shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f0] text-[#c46464]">
          <BookHeart size={22} />
        </div>
        <p className="mt-4 text-[18px] font-semibold text-[#7a3d3d]">
          비밀편지 상세를 확인할 수 없습니다.
        </p>
        <p className="mt-2 text-sm text-[#9a4b4b]">{errorMessage ?? "편지 정보를 찾을 수 없습니다."}</p>
        <Link
          href="/admin/letters"
          className="mt-5 inline-flex text-sm font-semibold text-[#7a3d3d] underline decoration-[#e4a6a6] underline-offset-4"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <Link
          href="/admin/letters"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
        >
          <ChevronLeft size={16} />
          비밀편지 목록
        </Link>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Letter Detail
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#223552]">
              편지 #{letter.letterId}
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[#6e83a5]">
              발신자, 수신자, 원문과 답장 내용을 읽기 전용으로 확인합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getStatusTone(letter.status)}`}
            >
              {formatAdminLetterStatusLabel(letter.status)}
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6680a5] ring-1 ring-[#dce7f8]">
              읽기 전용
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <InfoStat label="발신자" value={formatAdminLetterMemberLabel(letter.sender)} />
          <InfoStat label="수신자" value={formatAdminLetterMemberLabel(letter.receiver)} />
          <InfoStat label="생성 시각" value={formatAdminLetterDateTime(letter.createdAt)} />
          <InfoStat label="답장 시각" value={formatAdminLetterDateTime(letter.replyCreatedAt)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf5ff] text-[#4f8cf0]">
                <BookHeart size={20} />
              </div>
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
                  원본 편지
                </h2>
                <p className="mt-1 text-sm text-[#8ba0bf]">{letter.title}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f8fbff] px-5 py-5 text-[15px] leading-7 whitespace-pre-wrap text-[#405a7f]">
              {hasText(letter.content) ? letter.content : "원문 내용을 확인할 수 없습니다."}
            </div>
          </div>

          <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eefbf4] text-[#37a264]">
                <MailCheck size={20} />
              </div>
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
                  답장 내용
                </h2>
                <p className="mt-1 text-sm text-[#8ba0bf]">
                  {hasText(letter.replyContent) ? "답장 전문을 확인합니다." : "아직 등록된 답장이 없습니다."}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f8fbff] px-5 py-5 text-[15px] leading-7 whitespace-pre-wrap text-[#405a7f]">
              {hasText(letter.replyContent) ? letter.replyContent : "아직 답장이 등록되지 않았습니다."}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
              요약 메모
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6c82a5]">
              AI 요약본이 있으면 운영 확인용으로 함께 표시합니다.
            </p>

            <div className="mt-5 space-y-4">
              <SummaryBox
                label="원문 요약"
                icon={<UserRound size={16} />}
                value={letter.summary}
              />
              <SummaryBox
                label="답장 요약"
                icon={<PenSquare size={16} />}
                value={letter.replySummary}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_24px_44px_-44px_rgba(77,119,176,0.45)]">
      <p className="text-sm font-semibold text-[#7e94b5]">{label}</p>
      <p className="mt-2 text-[18px] font-semibold text-[#223552]">{value}</p>
    </div>
  );
}

function SummaryBox({
  label,
  icon,
  value,
}: {
  label: string;
  icon: ReactNode;
  value: string | null;
}) {
  return (
    <div className="rounded-[22px] bg-[#f7fbff] px-4 py-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#5b7397]">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#405a7f]">
        {hasText(value) ? value : "등록된 요약이 없습니다."}
      </p>
    </div>
  );
}
