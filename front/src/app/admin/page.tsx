"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookHeart,
  ChevronRight,
  ExternalLink,
  Flag,
  Inbox,
  Loader2,
  Mail,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import {
  getAdminDashboardStats,
  getGrafanaSessionState,
} from "@/lib/admin/admin-dashboard-service";
import type {
  AdminDashboardStats,
  GrafanaSessionState,
} from "@/lib/admin/admin-dashboard-types";
import {
  buildGrafanaPanelUrl,
  GRAFANA_PANEL_DEFINITIONS,
  getGrafanaHomeUrl,
  getK6GrafanaDashboardUrl,
  getPrometheusHomeUrl,
} from "@/lib/admin/grafana-dashboard";
import { toErrorMessage } from "@/lib/api/rs-data";

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
  icon: typeof Flag;
  tone: string;
}) {
  return (
    <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}
      >
        <Icon size={20} />
      </div>
      <p className="mt-5 text-sm font-semibold text-[#7f95b5]">{label}</p>
      <p className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-[#223552]">
        {value}
      </p>
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
          <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[#223552]">
            {title}
          </h2>
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

function GrafanaFallbackCard({
  state,
  onRetry,
}: {
  state: Exclude<GrafanaSessionState, "ready">;
  onRetry: () => void;
}) {
  if (state === "checking") {
    return (
      <section className="rounded-[30px] bg-white px-6 py-8 text-[#5f7598] shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-[#4f8cf0]" size={18} />
          <p className="text-sm font-semibold">Grafana 세션을 확인하는 중입니다.</p>
        </div>
      </section>
    );
  }

  const isLoginRequired = state === "login-required";
  const isDisabled = state === "disabled";

  return (
    <section className="rounded-[30px] bg-white px-6 py-7 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
            Observability
          </p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#223552]">
            {isLoginRequired
              ? "Grafana 로그인 필요"
              : isDisabled
                ? "Observability 미구성"
                : "Grafana 연결 확인 필요"}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#6e83a5]">
            {isLoginRequired
              ? "패널은 Grafana 세션이 있어야 보입니다. 새 창에서 먼저 로그인한 뒤 이 화면으로 돌아오면 iframe 패널을 바로 확인할 수 있습니다."
              : isDisabled
                ? "모니터링 프록시가 아직 구성되지 않았습니다. 운영에서는 monitor ingress나 내부 프록시 주소가 연결돼 있어야 Grafana 패널을 표시할 수 있습니다."
              : "로컬 모니터링 스택이 응답하지 않습니다. docker compose로 Grafana, Prometheus, Nginx가 정상 기동했는지 먼저 확인해야 합니다."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isDisabled ? (
            <a
              href={getGrafanaHomeUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#4f8cf0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3e7fe7]"
            >
              {isLoginRequired ? "Grafana 로그인 열기" : "Grafana 열기"}
              <ExternalLink size={14} />
            </a>
          ) : null}
          {!isDisabled ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8] transition hover:text-[#35527e]"
            >
              다시 확인
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [grafanaState, setGrafanaState] =
    useState<GrafanaSessionState>("checking");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setGrafanaState("checking");

    const [statsResult, grafanaResult] = await Promise.allSettled([
      getAdminDashboardStats(),
      getGrafanaSessionState(),
    ]);

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      setStats(null);
      setErrorMessage(toErrorMessage(statsResult.reason));
    }

    if (grafanaResult.status === "fulfilled") {
      setGrafanaState(grafanaResult.value);
    } else {
      setGrafanaState("unavailable");
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard]);

  const summaryCards = useMemo(
    () => [
      {
        label: "오늘 접수 신고",
        value: stats?.todayReportsCount ?? 0,
        helper: "오늘 기준 새로 들어온 신고",
        icon: Flag,
        tone: "bg-[#edf5ff] text-[#4f8cf0]",
      },
      {
        label: "처리 대기",
        value: stats?.pendingReportsCount ?? 0,
        helper: "먼저 확인이 필요한 항목",
        icon: Inbox,
        tone: "bg-[#eefbf4] text-[#37b36a]",
      },
      {
        label: "처리 완료",
        value: stats?.processedReportsCount ?? 0,
        helper: "운영 판단이 끝난 신고",
        icon: ShieldCheck,
        tone: "bg-[#fff6eb] text-[#f2a34b]",
      },
      {
        label: "오늘 생성 편지",
        value: stats?.todayLettersCount ?? 0,
        helper: "오늘 생성된 비밀편지",
        icon: Mail,
        tone: "bg-[#fff1f1] text-[#e17272]",
      },
      {
        label: "오늘 작성 일기",
        value: stats?.todayDiariesCount ?? 0,
        helper: "오늘 기록된 개인 일기",
        icon: BookHeart,
        tone: "bg-[#f4f0ff] text-[#8b64dc]",
      },
      {
        label: "수신 허용 회원",
        value: stats?.availableReceiversCount ?? 0,
        helper: "현재 랜덤 편지를 받을 수 있는 회원",
        icon: UserRoundCheck,
        tone: "bg-[#eef8ff] text-[#4d87c4]",
      },
    ],
    [stats],
  );
  const showObservabilityLinks = grafanaState !== "disabled";

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
            {showObservabilityLinks ? (
              <a
                href={getGrafanaHomeUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8] transition hover:text-[#35527e]"
              >
                Grafana 열기
                <ExternalLink size={14} />
              </a>
            ) : null}
            {showObservabilityLinks ? (
              <a
                href={getPrometheusHomeUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8] transition hover:text-[#35527e]"
              >
                Prometheus 열기
                <ExternalLink size={14} />
              </a>
            ) : null}
            {showObservabilityLinks ? (
              <a
                href={getK6GrafanaDashboardUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8] transition hover:text-[#35527e]"
              >
                k6 대시보드
                <ExternalLink size={14} />
              </a>
            ) : null}
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1 rounded-full bg-[#4f8cf0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3e7fe7]"
            >
              신고 관리
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          대시보드 집계 데이터를 불러오지 못했습니다. {errorMessage}
        </div>
      ) : null}

      {!isLoading && grafanaState !== "ready" ? (
        <GrafanaFallbackCard state={grafanaState} onRetry={() => void loadDashboard()} />
      ) : null}

      {!isLoading && grafanaState === "ready" ? (
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
      ) : null}
    </div>
  );
}
