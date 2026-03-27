"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileWarning, ShieldAlert, Siren, UserRoundX } from "lucide-react";
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

  if (isLoading) {
    return (
      <div className="rounded-[28px] bg-white px-6 py-14 text-center text-[#5f7598] shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        신고 상세를 불러오는 중입니다.
      </div>
    );
  }

  if (loadErrorMessage || !report) {
    return (
      <div className="rounded-[28px] border border-[#f3d0d0] bg-white px-6 py-12 text-center shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f0] text-[#c46464]">
          <ShieldAlert size={22} />
        </div>
        <p className="mt-4 text-[18px] font-semibold text-[#7a3d3d]">
          신고 상세를 확인할 수 없습니다.
        </p>
        <p className="mt-2 text-sm text-[#9a4b4b]">{loadErrorMessage ?? "신고 정보를 찾을 수 없습니다."}</p>
        <Link
          href="/admin/reports"
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
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
        >
          <ChevronLeft size={16} />
          신고 목록
        </Link>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Report Detail
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#223552]">
              신고 #{report.reportId}
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[#6e83a5]">
              신고자, 대상 정보, 처리 액션을 한 번에 확인합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getStatusTone(report.status)}`}
            >
              {formatAdminReportStatusLabel(report.status)}
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6680a5] ring-1 ring-[#dce7f8]">
              {formatAdminReportActionLabel(report.processingAction)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <InfoStat label="신고자" value={report.reporterNickname} />
          <InfoStat label="대상 타입" value={formatAdminReportTargetTypeLabel(report.targetInfo.targetType)} />
          <InfoStat label="대상 ID" value={report.targetInfo.targetId} />
          <InfoStat label="접수 시각" value={formatAdminReportDateTime(report.createdAt)} />
        </div>
      </section>

      {noticeMessage ? (
        <div className="rounded-[24px] border border-[#d5ead8] bg-[#f1fbf2] px-5 py-4 text-sm text-[#3e6f49]">
          {noticeMessage}
        </div>
      ) : null}

      {actionErrorMessage ? (
        <div className="rounded-[24px] border border-[#f3d0d0] bg-[#fff8f8] px-5 py-4 text-sm text-[#9a4b4b]">
          {actionErrorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf5ff] text-[#4f8cf0]">
                <Siren size={20} />
              </div>
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
                  신고 설명
                </h2>
                <p className="mt-1 text-sm text-[#8ba0bf]">
                  운영자가 우선 확인해야 할 사유입니다.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f8fbff] px-5 py-5 text-[15px] leading-7 text-[#405a7f]">
              <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#7e95b5] ring-1 ring-[#e3ebf7]">
                사유 {report.reason}
              </div>
              <p>
                {report.description?.trim().length
                  ? report.description
                  : "신고 설명이 비어 있습니다."}
              </p>
            </div>
          </div>

          <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff6eb] text-[#f2a34b]">
                <FileWarning size={20} />
              </div>
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
                  신고 대상 원문
                </h2>
                <p className="mt-1 text-sm text-[#8ba0bf]">
                  작성자 {report.targetInfo.authorNickname || "알 수 없음"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f8fbff] px-5 py-5 text-[15px] leading-7 whitespace-pre-wrap text-[#405a7f]">
              {report.targetInfo.originalContent?.trim().length
                ? report.targetInfo.originalContent
                : "원문 내용을 확인할 수 없습니다."}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
              처리 액션
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6c82a5]">
              현재 백엔드가 지원하는 세 가지 처리만 노출합니다.
            </p>

            <div className="mt-5 grid gap-3">
              {REPORT_ACTIONS.map((action) => {
                const actionUnavailable =
                  action === "DELETE" && report.targetInfo.targetType !== "POST";
                const disabled = report.status === "PROCESSED" || isHandling || actionUnavailable;

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
              <p className="mt-4 text-sm text-[#6c82a5]">이 신고는 이미 처리되었습니다.</p>
            ) : null}
          </div>

          <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f1] text-[#e17272]">
                <UserRoundX size={20} />
              </div>
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
                  대상 정보
                </h2>
                <p className="mt-1 text-sm text-[#8ba0bf]">처리 전 마지막 확인용 카드입니다.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4 rounded-[24px] bg-[#f8fbff] px-5 py-5 text-sm text-[#526987]">
              <InfoRow label="신고 상태" value={formatAdminReportStatusLabel(report.status)} />
              <InfoRow label="최근 처리" value={formatAdminReportActionLabel(report.processingAction)} />
              <InfoRow label="대상 유형" value={formatAdminReportTargetTypeLabel(report.targetInfo.targetType)} />
              <InfoRow label="대상 식별값" value={report.targetInfo.targetId} />
              <InfoRow label="작성자" value={report.targetInfo.authorNickname || "알 수 없음"} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[26px] bg-white px-5 py-5 shadow-[0_26px_52px_-44px_rgba(77,119,176,0.42)]">
      <p className="text-sm font-semibold text-[#7d92b3]">{label}</p>
      <p className="mt-3 text-[20px] font-semibold tracking-[-0.03em] text-[#2c4363]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#e5edf8] pb-3 last:border-b-0 last:pb-0">
      <span className="font-semibold text-[#7d92b3]">{label}</span>
      <span className="text-right font-semibold text-[#2c4363]">{value}</span>
    </div>
  );
}
