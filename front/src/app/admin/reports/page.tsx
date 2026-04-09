"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronRight,
  FileWarning,
  Flag,
  Inbox,
  Mail,
  MessageSquare,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  formatAdminReportActionLabel,
  formatAdminReportDateTime,
  formatAdminReportStatusLabel,
  formatAdminReportTargetTypeLabel,
  isAdminReportActionSupported,
  matchesAdminReportQuery,
  sortAdminReports,
} from "@/lib/admin/report-presenter";
import { getAdminReports, handleAdminReport } from "@/lib/admin/report-service";
import type {
  AdminReportAction,
  AdminReportListItem,
  AdminReportSortOption,
  AdminReportStatus,
} from "@/lib/admin/report-types";
import { toErrorMessage } from "@/lib/api/rs-data";

const REPORT_FILTERS = ["전체", "RECEIVED", "PROCESSED"] as const;
const REPORT_TARGET_FILTERS = ["ALL", "POST", "COMMENT", "LETTER"] as const;
const REPORT_SORT_OPTIONS: { value: AdminReportSortOption; label: string }[] = [
  { value: "LATEST", label: "최신순" },
  { value: "PENDING_FIRST", label: "미처리 우선" },
];
const QUICK_ACTIONS: AdminReportAction[] = ["REJECT", "DELETE", "BLOCK_USER"];
const TREND_DAYS = 7;

type ReportFilter = (typeof REPORT_FILTERS)[number];
type ReportTargetFilter = (typeof REPORT_TARGET_FILTERS)[number];

interface PendingQuickAction {
  reportId: number;
  action: AdminReportAction;
}

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
  const [activeTargetFilter, setActiveTargetFilter] = useState<ReportTargetFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<AdminReportSortOption>("PENDING_FIRST");
  const [pendingQuickAction, setPendingQuickAction] = useState<PendingQuickAction | null>(null);
  const [isQuickHandling, setIsQuickHandling] = useState(false);
  const [quickActionNoticeMessage, setQuickActionNoticeMessage] = useState<string | null>(null);
  const [quickActionErrorMessage, setQuickActionErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchReports(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getAdminReports();
        if (!cancelled) {
          setReports(data);
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

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (activeFilter !== "전체" && report.status !== activeFilter) {
        return false;
      }

      if (activeTargetFilter !== "ALL" && report.targetType !== activeTargetFilter) {
        return false;
      }

      return matchesAdminReportQuery(report, searchQuery);
    });
  }, [activeFilter, activeTargetFilter, reports, searchQuery]);

  const visibleReports = useMemo(() => {
    return sortAdminReports(filteredReports, sortOption);
  }, [filteredReports, sortOption]);

  useEffect(() => {
    if (pendingQuickAction && !visibleReports.some((report) => report.reportId === pendingQuickAction.reportId)) {
      setPendingQuickAction(null);
    }
  }, [pendingQuickAction, visibleReports]);

  const summaryCards = useMemo(() => {
    const receivedCount = reports.filter((report) => report.status === "RECEIVED").length;
    const postCount = reports.filter((report) => report.targetType === "POST").length;
    const commentCount = reports.filter((report) => report.targetType === "COMMENT").length;
    const letterCount = reports.filter((report) => report.targetType === "LETTER").length;

    return [
      {
        label: "총 신고",
        value: reports.length,
        icon: Flag,
        iconTone: "bg-[#edf5ff] text-[#4f8cf0]",
      },
      {
        label: "접수 중 신고",
        value: receivedCount,
        icon: Inbox,
        iconTone: "bg-[#eefbf4] text-[#37b36a]",
      },
      {
        label: "게시글 신고",
        value: postCount,
        icon: FileWarning,
        iconTone: "bg-[#fff6eb] text-[#f2a34b]",
      },
      {
        label: "댓글 신고",
        value: commentCount,
        icon: MessageSquare,
        iconTone: "bg-[#f3f0ff] text-[#7758d1]",
      },
      {
        label: "비밀편지 신고",
        value: letterCount,
        icon: Mail,
        iconTone: "bg-[#fff1f1] text-[#e17272]",
      },
    ];
  }, [reports]);

  const trendItems = useMemo(() => buildTrendItems(reports), [reports]);
  const reasonKeywords = useMemo(() => buildReasonKeywords(reports), [reports]);

  function selectQuickAction(reportId: number, action: AdminReportAction): void {
    setPendingQuickAction({ reportId, action });
    setQuickActionErrorMessage(null);
  }

  async function executeQuickAction(report: AdminReportListItem): Promise<void> {
    if (!pendingQuickAction || pendingQuickAction.reportId !== report.reportId || isQuickHandling) {
      return;
    }

    setIsQuickHandling(true);
    setQuickActionErrorMessage(null);
    setQuickActionNoticeMessage(null);

    try {
      await handleAdminReport(report.reportId, pendingQuickAction.action);
      setReports((current) =>
        current.map((item) =>
          item.reportId === report.reportId ? { ...item, status: "PROCESSED" } : item,
        ),
      );
      setPendingQuickAction(null);
      setQuickActionNoticeMessage(
        `${formatAdminReportActionLabel(pendingQuickAction.action, report.targetType)} 처리가 완료되었습니다.`,
      );
    } catch (error: unknown) {
      setQuickActionErrorMessage(toErrorMessage(error));
    } finally {
      setIsQuickHandling(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-[#223552]">
              신고 관리 현황
            </h1>
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              iconTone={card.iconTone}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
        <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
              최근 7일 신고 추이
            </h2>
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

          <div className="mt-5 flex flex-wrap gap-3">
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
          <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#223552]">
            최근 접수된 신고
          </h2>
          <div className="rounded-full bg-[#eff5ff] px-4 py-2 text-sm font-semibold text-[#5f7ca8]">
            총 {visibleReports.length}건
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_200px_180px]">
          <label className="flex items-center gap-3 rounded-[22px] border border-[#dce7f8] bg-[#f8fbff] px-4 py-3 text-[#7f97ba]">
            <Search size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="신고자, 사유, 대상 ID로 검색"
              className="w-full bg-transparent text-sm text-[#314969] outline-none placeholder:text-[#9cb1cc]"
            />
          </label>

          <label className="flex items-center gap-3 rounded-[22px] border border-[#dce7f8] bg-[#f8fbff] px-4 py-3 text-[#7f97ba]">
            <ShieldAlert size={18} />
            <select
              value={activeTargetFilter}
              onChange={(event) => setActiveTargetFilter(event.target.value as ReportTargetFilter)}
              className="w-full bg-transparent text-sm font-semibold text-[#314969] outline-none"
            >
              {REPORT_TARGET_FILTERS.map((filter) => (
                <option key={filter} value={filter}>
                  {filter === "ALL" ? "전체 대상" : formatAdminReportTargetTypeLabel(filter)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-[22px] border border-[#dce7f8] bg-[#f8fbff] px-4 py-3 text-[#7f97ba]">
            <ArrowUpDown size={18} />
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as AdminReportSortOption)}
              className="w-full bg-transparent text-sm font-semibold text-[#314969] outline-none"
            >
              {REPORT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="mt-6 rounded-[24px] bg-[#f7fbff] px-6 py-14 text-center text-[#5f7598]">
            신고 목록을 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && !errorMessage && quickActionNoticeMessage ? (
          <div className="mt-6 rounded-[20px] border border-[#d5ead8] bg-[#f1fbf2] px-5 py-4 text-sm text-[#3e6f49]">
            {quickActionNoticeMessage}
          </div>
        ) : null}

        {!isLoading && !errorMessage && quickActionErrorMessage ? (
          <div className="mt-6 rounded-[20px] border border-[#f3d0d0] bg-[#fff8f8] px-5 py-4 text-sm text-[#9a4b4b]">
            {quickActionErrorMessage}
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
          <div className="overflow-hidden rounded-[24px] border border-[#e6eef9]">
            <div className="overflow-x-auto">
              <div className="min-w-[1120px]">
                <div className="hidden grid-cols-[88px_144px_112px_104px_minmax(240px,1fr)_108px_160px_180px] items-center gap-4 bg-[#f7fbff] px-6 py-4 text-sm font-semibold text-[#6d82a5] lg:grid">
                  <span className="whitespace-nowrap">신고 ID</span>
                  <span className="whitespace-nowrap">신고자</span>
                  <span className="whitespace-nowrap">대상 타입</span>
                  <span className="whitespace-nowrap">대상 ID</span>
                  <span className="whitespace-nowrap">사유</span>
                  <span className="whitespace-nowrap">상태</span>
                  <span className="whitespace-nowrap">생성일</span>
                  <span className="whitespace-nowrap text-right">액션</span>
                </div>

                <div className="divide-y divide-[#edf3fe]">
                  {visibleReports.map((report) => {
                    const activeQuickAction =
                      pendingQuickAction?.reportId === report.reportId ? pendingQuickAction.action : null;
                    const quickActions = QUICK_ACTIONS.filter((action) =>
                      isAdminReportActionSupported(action, report.targetType),
                    );

                    return (
                      <div key={report.reportId} className="px-6 py-5 transition hover:bg-[#f9fbff]">
                        <div className="hidden grid-cols-[88px_144px_112px_104px_minmax(240px,1fr)_108px_160px_180px] items-center gap-4 lg:grid">
                          <Link href={`/admin/reports/${report.reportId}`} className="contents">
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
                          </Link>

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {report.status === "RECEIVED"
                              ? quickActions.map((action) => {
                                  const selected = activeQuickAction === action;

                                  return (
                                    <button
                                      key={action}
                                      type="button"
                                      onClick={() => selectQuickAction(report.reportId, action)}
                                      disabled={isQuickHandling}
                                      className={`rounded-full px-2.5 py-2 text-[11px] font-semibold transition ${
                                        selected
                                          ? "bg-[#4f8cf0] text-white"
                                          : "bg-white text-[#5f7598] ring-1 ring-[#dce7f8] hover:text-[#35527e]"
                                      } disabled:cursor-not-allowed disabled:opacity-70`}
                                    >
                                      {formatAdminReportActionLabel(action, report.targetType)}
                                    </button>
                                  );
                                })
                              : null}
                            <Link
                              href={`/admin/reports/${report.reportId}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#edf5ff] px-3 py-2 text-[11px] font-semibold text-[#3d7fe1] transition hover:bg-[#e3efff]"
                            >
                              상세
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>

                        <div className="space-y-3 lg:hidden">
                          <Link href={`/admin/reports/${report.reportId}`} className="block">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-[#29405f]">#{report.reportId}</span>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(report.status)}`}
                              >
                                {formatAdminReportStatusLabel(report.status)}
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm text-[#526987] sm:grid-cols-2">
                              <p>신고자 {report.reporterNickname}</p>
                              <p>대상 {formatAdminReportTargetTypeLabel(report.targetType)}</p>
                              <p>대상 ID {report.targetId}</p>
                              <p>{formatAdminReportDateTime(report.createdAt)}</p>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-[#314969]">{report.reason}</p>
                          </Link>

                          <div className="flex flex-wrap items-center gap-2">
                            {report.status === "RECEIVED"
                              ? quickActions.map((action) => {
                                  const selected = activeQuickAction === action;

                                  return (
                                    <button
                                      key={action}
                                      type="button"
                                      onClick={() => selectQuickAction(report.reportId, action)}
                                      disabled={isQuickHandling}
                                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                        selected
                                          ? "bg-[#4f8cf0] text-white"
                                          : "bg-white text-[#5f7598] ring-1 ring-[#dce7f8] hover:text-[#35527e]"
                                      } disabled:cursor-not-allowed disabled:opacity-70`}
                                    >
                                      {formatAdminReportActionLabel(action, report.targetType)}
                                    </button>
                                  );
                                })
                              : null}
                            <Link
                              href={`/admin/reports/${report.reportId}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#edf5ff] px-3 py-2 text-xs font-semibold text-[#3d7fe1] transition hover:bg-[#e3efff]"
                            >
                              상세 보기
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>

                        {activeQuickAction ? (
                          <div className="mt-4 rounded-[20px] border border-[#dce7f8] bg-[#f8fbff] px-4 py-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <p className="text-sm font-semibold text-[#5f7598]">
                                {formatAdminReportActionLabel(activeQuickAction, report.targetType)}
                              </p>
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPendingQuickAction(null)}
                                  disabled={isQuickHandling}
                                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5f7598] ring-1 ring-[#dce7f8] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void executeQuickAction(report)}
                                  disabled={isQuickHandling}
                                  className="rounded-full bg-[#4f8cf0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3f80eb] disabled:cursor-not-allowed disabled:bg-[#b6c9e7]"
                                >
                                  {isQuickHandling ? "처리 중..." : "이 행에서 바로 처리"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
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
  icon: Icon,
  iconTone,
}: {
  label: string;
  value: number;
  icon: typeof Flag;
  iconTone: string;
}) {
  return (
    <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconTone}`}>
        <Icon size={22} />
      </div>
      <p className="mt-5 text-sm font-semibold text-[#7f95b5]">{label}</p>
      <p className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-[#223552]">{value}</p>
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
