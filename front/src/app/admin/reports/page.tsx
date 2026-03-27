"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ShieldAlert } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
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

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-5xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-[#83a1c8] uppercase">
                Admin Reports
              </p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#223552] sm:text-[34px]">
                신고 관리
              </h1>
              <p className="mt-2 text-[15px] leading-7 text-[#6d82a5]">
                접수된 신고를 확인하고 필요한 조치를 진행합니다.
              </p>
            </div>

            <div className="rounded-full bg-[#edf5ff] px-4 py-2 text-sm font-semibold text-[#5978a6]">
              총 {reports.length}건
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
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
                      ? "bg-[#78A7E6] text-white"
                      : "bg-white text-[#5d7397] ring-1 ring-[#dce7f8] hover:text-[#38547d]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="home-panel mt-6 rounded-[28px] px-6 py-14 text-center text-[#5f7598]">
              신고 목록을 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="home-panel mt-6 rounded-[28px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-12 text-center">
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
            <div className="home-panel mt-6 rounded-[28px] px-6 py-14 text-center text-[#5f7598]">
              현재 조건에 맞는 신고가 없습니다.
            </div>
          ) : null}

          {!isLoading && !errorMessage && visibleReports.length > 0 ? (
            <section className="home-panel mt-6 overflow-hidden rounded-[30px]">
              <div className="hidden grid-cols-[110px_140px_130px_120px_minmax(0,1fr)_120px_180px_30px] items-center gap-4 border-b border-[#e8f0fd] px-6 py-4 text-sm font-semibold text-[#6d82a5] lg:grid">
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
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
}
