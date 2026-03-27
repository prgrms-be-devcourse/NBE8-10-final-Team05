"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Flag, FileWarning, Inbox, ShieldAlert } from "lucide-react";
import {
  formatAdminReportDateTime,
  formatAdminReportStatusLabel,
  formatAdminReportTargetTypeLabel,
  sortAdminReportsByCreatedAtDesc,
} from "@/lib/admin/report-presenter";
import { getAdminReports } from "@/lib/admin/report-service";
import type { AdminReportListItem, AdminReportStatus } from "@/lib/admin/report-types";
import { toErrorMessage } from "@/lib/api/rs-data";

const REPORT_FILTERS = ["전체", "RECEIVED", "PROCESSED"] as const;
const TREND_DAYS = 7;

type ReportFilter = (typeof REPORT_FILTERS)[number];

function getStatusTone(status: AdminReportStatus): string {
  if (status === "PROCESSED") {
    return "bg-[#eef7ef] text-[#457650]";
  }

  return "bg-[#eef5ff] text-[#4f6fa8]";
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ReportFilter>("전체");

  useEffect(() => {
    let cancelled = false;

    async function fetchReports(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getAdminReports();
        if (!cancelled) {
          setReports(sortAdminReportsByCreatedAtDesc(data));
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setReports([]);
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleReports = useMemo(() => {
    if (activeFilter === "전체") {
      return reports;
    }

    return reports.filter((report) => report.status === activeFilter);
  }, [activeFilter, reports]);

  const summaryCards = useMemo(() => {
    const receivedCount = reports.filter((report) => report.status === "RECEIVED").length;
    const processedCount = reports.filter((report) => report.status === "PROCESSED").length;
    const postCount = reports.filter((report) => report.targetType === "POST").length;
    const letterCount = reports.filter((report) => report.targetType === "LETTER").length;

    return [
      {
        label: "총 신고",
        value: reports.length,
        helper: "누적 접수 건수",
        icon: Flag,
        iconTone: "bg-[#edf5ff] text-[#4f8cf0]",
      },
      {
        label: "접수 중 신고",
        value: receivedCount,
        helper: "우선 확인 필요",
        icon: Inbox,
        iconTone: "bg-[#eefbf4] text-[#37b36a]",
      },
      {
        label: "게시글 신고",
        value: postCount,
        helper: "커뮤니티 대상",
        icon: FileWarning,
        iconTone: "bg-[#fff6eb] text-[#f2a34b]",
      },
      {
        label: "비밀편지 신고",
        value: letterCount,
        helper: processedCount > 0 ? `처리 완료 ${processedCount}건` : "아직 처리 완료 없음",
        icon: ShieldAlert,
        iconTone: "bg-[#fff1f1] text-[#e17272]",
      },
    ];
  }, [reports]);

  const trendItems = useMemo(() => buildTrendItems(reports), [reports]);
  const reasonKeywords = useMemo(() => buildReasonKeywords(reports), [reports]);

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Admin Reports
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#223552]">
              신고 관리 현황
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[#6e83a5]">
              접수된 신고와 처리 대기 항목을 한 화면에서 정리합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {REPORT_FILTERS.map((filter) => {
              const active = filter === activeFilter;
              const label = filter === "전체" ? filter : formatAdminReportStatusLabel(filter);

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
                최근 7일 신고 추이
              </h2>
              <p className="mt-2 text-sm text-[#89a0c1]">
                일자별 접수량을 간단히 확인합니다.
              </p>
            </div>
            <div className="rounded-full bg-[#eff5ff] px-4 py-2 text-sm font-semibold text-[#5f7ca8]">
              최근 {TREND_DAYS}일
            </div>
          </div>

          <div className="mt-8 flex h-[280px] items-end justify-between gap-3 sm:gap-5">
            {trendItems.map((item) => (
              <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                <div className="flex h-[224px] w-full items-end justify-center">
                  <div
                    className={`w-full max-w-[72px] rounded-t-[26px] transition ${
                      item.count > 0 ? "bg-gradient-to-b from-[#95c2f6] to-[#4f8cf0]" : "bg-[#e8eff9]"
                    }`}
                    style={{ height: `${item.height}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-[#496281]">{item.label}</p>
                  <p className="mt-1 text-xs text-[#91a5c2]">{item.count}건</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
            자주 들어온 사유
          </h2>
          <p className="mt-2 text-sm text-[#89a0c1]">
            신고 사유가 반복되는 항목을 먼저 살펴보세요.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {reasonKeywords.length > 0 ? (
              reasonKeywords.map((reason, index) => (
                <span
                  key={`${reason.label}-${index}`}
                  className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                    index % 4 === 0
                      ? "bg-[#eef5ff] text-[#4f8cf0]"
                      : index % 4 === 1
                        ? "bg-[#fff2f2] text-[#de6e82]"
                        : index % 4 === 2
                          ? "bg-[#fff8ec] text-[#ec9f3d]"
                          : "bg-[#edf9f1] text-[#39ad67]"
                  }`}
                >
                  {reason.label}
                  <span className="ml-2 text-[12px] opacity-80">{reason.count}</span>
                </span>
              ))
            ) : (
              <p className="text-sm text-[#7a90b0]">집계할 신고 사유가 아직 없습니다.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#223552]">
              최근 접수된 신고
            </h2>
            <p className="mt-2 text-sm text-[#89a0c1]">
              선택한 필터 기준으로 최신 신고부터 정리합니다.
            </p>
          </div>
          <div className="rounded-full bg-[#eff5ff] px-4 py-2 text-sm font-semibold text-[#5f7ca8]">
            총 {visibleReports.length}건
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 rounded-[24px] bg-[#f7fbff] px-6 py-14 text-center text-[#5f7598]">
            신고 목록을 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="mt-6 rounded-[24px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f0] text-[#c46464]">
              <ShieldAlert size={22} />
            </div>
            <p className="mt-4 text-[18px] font-semibold text-[#7a3d3d]">
              신고 목록을 불러오지 못했습니다.
            </p>
            <p className="mt-2 text-sm text-[#9a4b4b]">{errorMessage}</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && visibleReports.length === 0 ? (
          <div className="mt-6 rounded-[24px] bg-[#f7fbff] px-6 py-14 text-center text-[#5f7598]">
            현재 조건에 맞는 신고가 없습니다.
          </div>
        ) : null}

        {!isLoading && !errorMessage && visibleReports.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e6eef9]">
            <div className="hidden grid-cols-[110px_140px_130px_120px_minmax(0,1fr)_120px_180px_30px] items-center gap-4 bg-[#f7fbff] px-6 py-4 text-sm font-semibold text-[#6d82a5] lg:grid">
              <span>신고 ID</span>
              <span>신고자</span>
              <span>대상 타입</span>
              <span>대상 ID</span>
              <span>사유</span>
              <span>상태</span>
              <span>생성일</span>
              <span />
            </div>

            <div className="divide-y divide-[#edf3fe]">
              {visibleReports.map((report) => (
                <Link
                  key={report.reportId}
                  href={`/admin/reports/${report.reportId}`}
                  className="block px-6 py-5 transition hover:bg-[#f9fbff]"
                >
                  <div className="hidden grid-cols-[110px_140px_130px_120px_minmax(0,1fr)_120px_180px_30px] items-center gap-4 lg:grid">
                    <span className="font-semibold text-[#29405f]">#{report.reportId}</span>
                    <span className="truncate text-[#516885]">{report.reporterNickname}</span>
                    <span className="text-[#516885]">
                      {formatAdminReportTargetTypeLabel(report.targetType)}
                    </span>
                    <span className="text-[#516885]">{report.targetId}</span>
                    <span className="truncate text-[#314969]">{report.reason}</span>
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(report.status)}`}
                    >
                      {formatAdminReportStatusLabel(report.status)}
                    </span>
                    <span className="text-sm text-[#6b81a2]">
                      {formatAdminReportDateTime(report.createdAt)}
                    </span>
                    <span className="text-[#9ab1d4]">
                      <ChevronRight size={18} />
                    </span>
                  </div>

                  <div className="space-y-3 lg:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#29405f]">#{report.reportId}</span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(report.status)}`}
                      >
                        {formatAdminReportStatusLabel(report.status)}
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm text-[#526987] sm:grid-cols-2">
                      <p>신고자 {report.reporterNickname}</p>
                      <p>대상 {formatAdminReportTargetTypeLabel(report.targetType)}</p>
                      <p>대상 ID {report.targetId}</p>
                      <p>{formatAdminReportDateTime(report.createdAt)}</p>
                    </div>
                    <p className="text-sm leading-6 text-[#314969]">{report.reason}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
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
  icon: typeof Flag;
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

function buildTrendItems(reports: AdminReportListItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (TREND_DAYS - index - 1));

    return {
      key: date.toISOString(),
      dateKey: toDateKey(date),
      label: `${date.getMonth() + 1}.${date.getDate()}`,
      count: 0,
    };
  });

  reports.forEach((report) => {
    const key = toDateKey(new Date(report.createdAt));
    const bucket = buckets.find((item) => item.dateKey === key);
    if (bucket) {
      bucket.count += 1;
    }
  });

  const maxCount = Math.max(...buckets.map((item) => item.count), 0);

  return buckets.map((item) => ({
    ...item,
    height: maxCount === 0 ? 18 : Math.max(18, Math.round((item.count / maxCount) * 100)),
  }));
}

function buildReasonKeywords(reports: AdminReportListItem[]) {
  const map = new Map<string, number>();

  reports.forEach((report) => {
    const key = report.reason.trim();
    if (!key) {
      return;
    }

    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
}

function toDateKey(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
