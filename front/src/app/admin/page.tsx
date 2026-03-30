"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronRight,
  ExternalLink,
  Flag,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import {
  buildGrafanaPanelUrl,
  GRAFANA_PANEL_DEFINITIONS,
  getGrafanaHomeUrl,
  getPrometheusHomeUrl,
} from "@/lib/admin/grafana-dashboard";
import { getAdminReports } from "@/lib/admin/report-service";
import type { AdminReportListItem } from "@/lib/admin/report-types";
import { toErrorMessage } from "@/lib/api/rs-data";

function getTodayCount(reports: AdminReportListItem[]): number {
  const today = new Date();

  return reports.filter((report) => {
    const createdAt = new Date(report.createdAt);
    return (
      createdAt.getFullYear() === today.getFullYear() &&
      createdAt.getMonth() === today.getMonth() &&
      createdAt.getDate() === today.getDate()
    );
  }).length;
}

function getPendingCount(reports: AdminReportListItem[]): number {
  return reports.filter((report) => report.status === "RECEIVED").length;
}

function getProcessedCount(reports: AdminReportListItem[]): number {
  return reports.filter((report) => report.status === "PROCESSED").length;
}

function getLetterCount(reports: AdminReportListItem[]): number {
  return reports.filter((report) => report.targetType === "LETTER").length;
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
        <Icon size={20} />
      </div>
      <p className="mt-5 text-sm font-semibold text-[#7f95b5]">{label}</p>
      <p className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-[#223552]">{value}</p>
      <p className="mt-2 text-sm text-[#93a6c1]">{helper}</p>
    </div>
  );
}

function GrafanaPanelCard({
  title,
  description,
  iframeSrc,
  height,
}: {
  title: string;
  description: string;
  iframeSrc: string;
  height: number;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
      <div className="flex items-start justify-between gap-4 border-b border-[#e8eef7] px-6 py-5">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[#223552]">{title}</h2>
          <p className="mt-2 text-sm text-[#8fa4c0]">{description}</p>
        </div>
        <a
          href={iframeSrc}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-[#f3f8ff] px-3 py-2 text-sm font-semibold text-[#4f7fbe] transition hover:text-[#2f5f9d]"
        >
          새 창
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="relative bg-[#f7fbff]" style={{ height }}>
        {!loaded ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#f4f8ff] via-[#eef5ff] to-[#f8fbff]" />
        ) : null}
        <iframe
          title={title}
          src={iframeSrc}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </section>
  );
}

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<AdminReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const summaryCards = useMemo(
    () => [
      {
        label: "오늘 접수 신고",
        value: getTodayCount(reports),
        helper: "오늘 기준 새로 들어온 신고",
        icon: Flag,
        tone: "bg-[#edf5ff] text-[#4f8cf0]",
      },
      {
        label: "처리 대기",
        value: getPendingCount(reports),
        helper: "먼저 확인이 필요한 항목",
        icon: Inbox,
        tone: "bg-[#eefbf4] text-[#37b36a]",
      },
      {
        label: "처리 완료",
        value: getProcessedCount(reports),
        helper: "운영 판단이 끝난 신고",
        icon: ShieldCheck,
        tone: "bg-[#fff6eb] text-[#f2a34b]",
      },
      {
        label: "비밀편지 신고",
        value: getLetterCount(reports),
        helper: "편지 도메인 대상 신고",
        icon: Activity,
        tone: "bg-[#fff1f1] text-[#e17272]",
      },
    ],
    [reports],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-[#223552]">
              운영 대시보드
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[#6e83a5]">
              신고 흐름과 애플리케이션 상태를 한 화면에서 확인합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={getGrafanaHomeUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8] transition hover:text-[#35527e]"
            >
              Grafana 열기
              <ExternalLink size={14} />
            </a>
            <a
              href={getPrometheusHomeUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8] transition hover:text-[#35527e]"
            >
              Prometheus 열기
              <ExternalLink size={14} />
            </a>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1 rounded-full bg-[#4f8cf0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3e7fe7]"
            >
              신고 관리
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-white/72 px-4 py-4 text-sm leading-6 text-[#6680a5] ring-1 ring-[#e4edf9]">
          Grafana 세션이 없으면 새 창에서 먼저 로그인한 뒤 돌아오면 iframe 패널이 그대로 보입니다.
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.label}
              label={card.label}
              value={card.value}
              helper={card.helper}
              icon={card.icon}
              tone={card.tone}
            />
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-[28px] bg-white px-6 py-12 text-center text-[#5f7598] shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          운영 지표를 불러오는 중입니다.
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-[28px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-10 text-center text-[#9a4b4b] shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          신고 요약 데이터를 불러오지 못했습니다. {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        {GRAFANA_PANEL_DEFINITIONS.map((panel) => (
          <GrafanaPanelCard
            key={panel.panelId}
            title={panel.title}
            description={panel.description}
            iframeSrc={buildGrafanaPanelUrl(panel.panelId)}
            height={panel.height}
          />
        ))}
      </section>
    </div>
  );
}
