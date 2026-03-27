"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import {
  formatAdminReportActionLabel,
  formatAdminReportDateTime,
  formatAdminReportStatusLabel,
  formatAdminReportTargetTypeLabel,
  getAdminReportActionDescription,
  getAdminReportActionPrompt,
} from "@/lib/admin/report-presenter";
import { getAdminReportDetail, handleAdminReport } from "@/lib/admin/report-service";
import type { AdminReportAction, AdminReportDetail } from "@/lib/admin/report-types";
import { toErrorMessage } from "@/lib/api/rs-data";

const REPORT_ACTIONS: AdminReportAction[] = ["REJECT", "DELETE", "BLOCK_USER"];

function parseReportId(value: string | string[] | undefined): number | null {
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

function getStatusTone(status: string): string {
  if (status === "PROCESSED") {
    return "bg-[#eef7ef] text-[#457650]";
  }

  return "bg-[#eef5ff] text-[#4f6fa8]";
}

export default function AdminReportDetailPage() {
  const params = useParams();
  const reportId = useMemo(() => parseReportId(params.id), [params.id]);

  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHandling, setIsHandling] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchReportDetail(id: number): Promise<void> {
      setIsLoading(true);
      setLoadErrorMessage(null);
      setActionErrorMessage(null);
      setNoticeMessage(null);

      try {
        const data = await getAdminReportDetail(id);
        if (!cancelled) {
          setReport(data);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setReport(null);
          setLoadErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (reportId === null) {
      setReport(null);
      setLoadErrorMessage("잘못된 신고 상세 경로입니다.");
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void fetchReportDetail(reportId);

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  async function onHandle(action: AdminReportAction) {
    if (!report || isHandling) {
      return;
    }

    if (!window.confirm(getAdminReportActionPrompt(action))) {
      return;
    }

    setIsHandling(true);
    setActionErrorMessage(null);
    setNoticeMessage(null);

    try {
      await handleAdminReport(report.reportId, action);
      setReport({
        ...report,
        status: "PROCESSED",
        processingAction: action,
      });
      setNoticeMessage(`${formatAdminReportActionLabel(action)} 처리가 완료되었습니다.`);
    } catch (error: unknown) {
      setActionErrorMessage(toErrorMessage(error));
    } finally {
      setIsHandling(false);
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-5xl">
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
          >
            <ChevronLeft size={16} />
            신고 목록
          </Link>

          {isLoading ? (
            <div className="home-panel mt-4 rounded-[28px] px-6 py-14 text-center text-[#5f7598]">
              신고 상세를 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && loadErrorMessage ? (
            <div className="home-panel mt-4 rounded-[28px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f0] text-[#c46464]">
                <ShieldAlert size={22} />
              </div>
              <p className="mt-4 text-[18px] font-semibold text-[#7a3d3d]">
                신고 상세를 확인할 수 없습니다.
              </p>
              <p className="mt-2 text-sm text-[#9a4b4b]">{loadErrorMessage}</p>
              <Link
                href="/admin/reports"
                className="mt-5 inline-flex text-sm font-semibold text-[#7a3d3d] underline decoration-[#e4a6a6] underline-offset-4"
              >
                목록으로 돌아가기
              </Link>
            </div>
          ) : null}

          {!isLoading && !loadErrorMessage && report ? (
            <div className="space-y-6">
              <section className="home-panel mt-4 rounded-[30px] px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold tracking-[0.18em] text-[#83a1c8] uppercase">
                      Report Detail
                    </p>
                    <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#223552]">
                      신고 #{report.reportId}
                    </h1>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${getStatusTone(report.status)}`}
                  >
                    {formatAdminReportStatusLabel(report.status)}
                  </span>
                </div>

                {noticeMessage ? (
                  <div className="mt-5 rounded-[18px] border border-[#d5ead8] bg-[#f1fbf2] px-4 py-3 text-sm text-[#3e6f49]">
                    {noticeMessage}
                  </div>
                ) : null}

                {actionErrorMessage ? (
                  <div className="mt-5 rounded-[18px] border border-[#f3d0d0] bg-[#fff8f8] px-4 py-3 text-sm text-[#9a4b4b]">
                    {actionErrorMessage}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard
                    label="신고자"
                    value={report.reporterNickname}
                  />
                  <InfoCard
                    label="사유"
                    value={report.reason}
                  />
                  <InfoCard
                    label="대상 타입"
                    value={formatAdminReportTargetTypeLabel(report.targetInfo.targetType)}
                  />
                  <InfoCard
                    label="생성일"
                    value={formatAdminReportDateTime(report.createdAt)}
                  />
                </div>
              </section>

              <section className="home-panel rounded-[30px] px-6 py-7 sm:px-8">
                <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#223552]">
                  신고 설명
                </h2>
                <div className="mt-4 rounded-[24px] bg-[#f8fbff] px-5 py-5 text-[15px] leading-7 text-[#405a7f]">
                  {report.description?.trim().length
                    ? report.description
                    : "신고 설명이 비어 있습니다."}
                </div>
              </section>

              <section className="home-panel rounded-[30px] px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#223552]">
                      대상 정보
                    </h2>
                    <p className="text-sm text-[#6c82a5]">
                      작성자 {report.targetInfo.authorNickname || "알 수 없음"} · 대상 ID{" "}
                      {report.targetInfo.targetId}
                    </p>
                  </div>

                  <div className="rounded-full bg-[#f4f8ff] px-4 py-2 text-sm font-semibold text-[#5c7599]">
                    최근 처리 결과 {formatAdminReportActionLabel(report.processingAction)}
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] bg-[#f8fbff] px-5 py-5 text-[15px] leading-7 whitespace-pre-wrap text-[#405a7f]">
                  {report.targetInfo.originalContent?.trim().length
                    ? report.targetInfo.originalContent
                    : "원문 내용을 확인할 수 없습니다."}
                </div>
              </section>

              <section className="home-panel rounded-[30px] px-6 py-7 sm:px-8">
                <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#223552]">
                  처리 액션
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6c82a5]">
                  현재 백엔드에서는 신고 반려, 게시글 숨김, 작성자 차단 세 가지 액션만 지원합니다.
                </p>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {REPORT_ACTIONS.map((action) => {
                    const actionUnavailable =
                      action === "DELETE" && report.targetInfo.targetType !== "POST";
                    const disabled =
                      report.status === "PROCESSED" || isHandling || actionUnavailable;

                    return (
                      <button
                        key={action}
                        type="button"
                        disabled={disabled}
                        onClick={() => void onHandle(action)}
                        className={`rounded-[24px] border px-5 py-5 text-left transition ${
                          disabled
                            ? "cursor-not-allowed border-[#e3ebf8] bg-[#f8fbff] text-[#9aaecc]"
                            : "border-[#dce7f8] bg-white text-[#314969] hover:border-[#86afe8] hover:bg-[#f9fbff]"
                        }`}
                      >
                        <p className="text-[17px] font-semibold tracking-[-0.02em]">
                          {formatAdminReportActionLabel(action)}
                        </p>
                        <p className="mt-2 text-sm leading-6">
                          {actionUnavailable
                            ? "게시글 신고에서만 사용할 수 있는 액션입니다."
                            : getAdminReportActionDescription(action)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {report.status === "PROCESSED" ? (
                  <p className="mt-4 text-sm text-[#6c82a5]">
                    이 신고는 이미 처리되었습니다.
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

interface InfoCardProps {
  label: string;
  value: string | number;
}

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-[24px] bg-[#f8fbff] px-5 py-5">
      <p className="text-sm font-semibold text-[#7d92b3]">{label}</p>
      <p className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-[#2c4363]">
        {value}
      </p>
    </div>
  );
}
