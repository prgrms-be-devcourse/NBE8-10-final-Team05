"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BadgeCheck,
  BookHeart,
  Gauge,
  LayoutDashboard,
  Loader2,
  LogOut,
  Server,
  Shield,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { type GrafanaSessionState } from "@/lib/admin/admin-dashboard-types";
import { getGrafanaSessionState } from "@/lib/admin/admin-dashboard-service";
import {
  formatMonitoringBasePath,
  getAdminMemberStatusLabel,
  getAdminRoleLabel,
  getMonitoringPrimaryActionLabel,
  getMonitoringStatusDescription,
  getMonitoringStatusLabel,
} from "@/lib/admin/admin-settings-presenter";
import {
  getGrafanaHomeUrl,
  getK6GrafanaDashboardUrl,
  getMonitoringProxyBaseUrl,
  getPrometheusHomeUrl,
} from "@/lib/admin/grafana-dashboard";
import { getPublicApiBaseUrl } from "@/lib/runtime/deployment-env";

type StatusCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  toneClassName: string;
};

type InternalLinkCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  toneClassName: string;
};

type ExternalLinkCardProps = InternalLinkCardProps;

const MONITORING_TONE_BY_STATE: Record<GrafanaSessionState, string> = {
  checking: "bg-[#eef5ff] text-[#4f8cf0]",
  ready: "bg-[#edf9f1] text-[#2f9b61]",
  "login-required": "bg-[#fff6ea] text-[#d38a2f]",
  disabled: "bg-[#f1f4f8] text-[#6b7b8f]",
  unavailable: "bg-[#fff1f1] text-[#d06363]",
};

function StatusCard({
  icon: Icon,
  label,
  value,
  helper,
  toneClassName,
}: StatusCardProps) {
  return (
    <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${toneClassName}`}
      >
        <Icon size={20} />
      </div>
      <p className="mt-5 text-sm font-semibold text-[#7f95b5]">{label}</p>
      <p className="mt-2 break-all text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#8fa4c0]">{helper}</p>
    </section>
  );
}

function InternalLinkCard({
  href,
  icon: Icon,
  title,
  description,
  toneClassName,
}: InternalLinkCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-[#e3ebf7] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-[#cfe0f8] hover:shadow-[0_24px_48px_-38px_rgba(77,119,176,0.5)]"
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClassName}`}
      >
        <Icon size={18} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#223552]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#8aa0bf]">{description}</p>
        </div>
        <ArrowUpRight
          size={18}
          className="mt-1 text-[#9ab0ce] transition group-hover:text-[#4f8cf0]"
        />
      </div>
    </Link>
  );
}

function ExternalLinkCard({
  href,
  icon: Icon,
  title,
  description,
  toneClassName,
}: ExternalLinkCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group rounded-[24px] border border-[#e3ebf7] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-[#cfe0f8] hover:shadow-[0_24px_48px_-38px_rgba(77,119,176,0.5)]"
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClassName}`}
      >
        <Icon size={18} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#223552]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#8aa0bf]">{description}</p>
        </div>
        <ArrowUpRight
          size={18}
          className="mt-1 text-[#9ab0ce] transition group-hover:text-[#4f8cf0]"
        />
      </div>
    </a>
  );
}

export default function AdminSettingsPage() {
  const { member } = useAuthStore();
  const [grafanaState, setGrafanaState] =
    useState<GrafanaSessionState>("checking");

  async function loadMonitoringState(): Promise<void> {
    setGrafanaState("checking");

    try {
      const nextState = await getGrafanaSessionState();
      setGrafanaState(nextState);
    } catch {
      setGrafanaState("unavailable");
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize(): Promise<void> {
      try {
        const nextState = await getGrafanaSessionState();
        if (active) {
          setGrafanaState(nextState);
        }
      } catch {
        if (active) {
          setGrafanaState("unavailable");
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  const roleLabel = getAdminRoleLabel(member?.role);
  const statusLabel = getAdminMemberStatusLabel(member?.status);
  const monitoringToneClassName = MONITORING_TONE_BY_STATE[grafanaState];
  const publicApiBaseUrl = getPublicApiBaseUrl();
  const monitoringBasePath = formatMonitoringBasePath(getMonitoringProxyBaseUrl());
  const showObservabilityLinks = grafanaState !== "disabled";

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
          Admin Settings
        </p>
        <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-[#223552]">
          관리자 설정
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#6e83a5]">
          운영 계정 상태, API/모니터링 진입점, 주요 관리자 화면과 시스템 도구를 한
          곳에서 확인하는 허브입니다.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <StatusCard
          icon={Shield}
          label="접근 권한"
          value={roleLabel}
          helper={`현재 계정 상태는 ${statusLabel}입니다.`}
          toneClassName="bg-[#edf5ff] text-[#4f8cf0]"
        />
        <StatusCard
          icon={Server}
          label="API 엔드포인트"
          value={publicApiBaseUrl}
          helper={`모니터링 프록시 기준 경로는 ${monitoringBasePath} 입니다.`}
          toneClassName="bg-[#eefbf4] text-[#2f9b61]"
        />
        <StatusCard
          icon={Gauge}
          label="Grafana 세션"
          value={getMonitoringStatusLabel(grafanaState)}
          helper={getMonitoringStatusDescription(grafanaState)}
          toneClassName={monitoringToneClassName}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
                  Workspace
                </p>
                <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
                  운영 화면 바로가기
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InternalLinkCard
                href="/admin"
                icon={LayoutDashboard}
                title="대시보드"
                description="오늘 신고, 편지, 일기, 모니터링 요약을 확인합니다."
                toneClassName="bg-[#edf5ff] text-[#4f8cf0]"
              />
              <InternalLinkCard
                href="/admin/members"
                icon={Users}
                title="회원 관리"
                description="관리자용 회원 생성, 조회, 프로필 수정을 바로 수행합니다."
                toneClassName="bg-[#eefbf4] text-[#37b36a]"
              />
              <InternalLinkCard
                href="/admin/letters"
                icon={BookHeart}
                title="비밀편지 관리"
                description="편지 발송 흐름과 상세 상태를 운영 관점에서 점검합니다."
                toneClassName="bg-[#fff1f1] text-[#e17272]"
              />
              <InternalLinkCard
                href="/admin/reports"
                icon={Shield}
                title="신고 관리"
                description="신고 내역을 조회하고 운영 판단을 이어서 처리합니다."
                toneClassName="bg-[#f4f0ff] text-[#8b64dc]"
              />
            </div>
          </section>

          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
                  Observability
                </p>
                <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
                  시스템 도구
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#8aa0bf]">
                  모니터링 접근과 개인 계정 설정을 빠르게 이동할 수 있도록 모았습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadMonitoringState()}
                disabled={grafanaState === "checking"}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  grafanaState === "checking"
                    ? "cursor-not-allowed bg-[#edf4ff] text-[#89a6d5]"
                    : "bg-[#f4f8ff] text-[#4f7fbe] hover:text-[#305f98]"
                }`}
              >
                {grafanaState === "checking" ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    확인 중
                  </>
                ) : (
                  "상태 새로고침"
                )}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {showObservabilityLinks ? (
                <ExternalLinkCard
                  href={getGrafanaHomeUrl()}
                  icon={Gauge}
                  title={getMonitoringPrimaryActionLabel(grafanaState)}
                  description={getMonitoringStatusDescription(grafanaState)}
                  toneClassName={monitoringToneClassName}
                />
              ) : (
                <section className="rounded-[24px] border border-[#e3ebf7] bg-[#f8fbff] px-5 py-5 md:col-span-2">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${monitoringToneClassName}`}
                  >
                    <Gauge size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#223552]">
                    {getMonitoringPrimaryActionLabel(grafanaState)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#8aa0bf]">
                    {getMonitoringStatusDescription(grafanaState)}
                  </p>
                </section>
              )}
              {showObservabilityLinks ? (
                <ExternalLinkCard
                  href={getPrometheusHomeUrl()}
                  icon={Server}
                  title="Prometheus"
                  description="메트릭 수집 상태와 즉시 쿼리를 직접 확인합니다."
                  toneClassName="bg-[#fff6ea] text-[#d38a2f]"
                />
              ) : null}
              {showObservabilityLinks ? (
                <ExternalLinkCard
                  href={getK6GrafanaDashboardUrl()}
                  icon={BadgeCheck}
                  title="K6 대시보드"
                  description="부하 테스트 결과와 런타임 지표를 같은 대시보드에서 봅니다."
                  toneClassName="bg-[#eef8ff] text-[#4d87c4]"
                />
              ) : null}
              <InternalLinkCard
                href="/settings"
                icon={UserRoundCog}
                title="내 계정 설정"
                description="이메일, 닉네임, 비밀번호, 랜덤 편지 수신 여부를 수정합니다."
                toneClassName="bg-[#f4f0ff] text-[#8b64dc]"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Current Admin
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
              현재 관리자 계정
            </h2>

            <div className="mt-5 rounded-[24px] border border-[#e3ebf7] bg-[#f8fbff] p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f1ff] text-lg font-bold text-[#4f8cf0]">
                {(member?.nickname ?? "A").slice(0, 1)}
              </div>

              <dl className="mt-4 space-y-3 text-sm text-[#5a7194]">
                <div className="flex items-center justify-between gap-3">
                  <dt>닉네임</dt>
                  <dd className="font-semibold text-[#223552]">
                    {member?.nickname ?? "관리자"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>이메일</dt>
                  <dd className="break-all text-right font-medium text-[#2f476b]">
                    {member?.email ?? "세션 복원 후 표시"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>권한</dt>
                  <dd className="font-medium text-[#2f476b]">{roleLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>계정 상태</dt>
                  <dd className="font-medium text-[#2f476b]">{statusLabel}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#4f8cf0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3f80eb]"
              >
                내 설정 열기
              </Link>
              <Link
                href="/logout"
                className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#dce7f8] bg-white px-4 py-3 text-sm font-semibold text-[#5d769b] transition hover:text-[#34527d]"
              >
                <LogOut size={15} />
                로그아웃
              </Link>
            </div>
          </section>

          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Checklist
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
              운영 점검 메모
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-[18px] border border-[#e3ebf7] bg-[#f8fbff] px-4 py-4">
                <p className="text-sm font-semibold text-[#2f476b]">
                  1. Grafana 상태 확인
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8aa0bf]">
                  현재 상태는 {getMonitoringStatusLabel(grafanaState)} 입니다. 관측 패널이
                  비어 있으면 {getMonitoringStatusDescription(grafanaState)}
                </p>
              </div>
              <div className="rounded-[18px] border border-[#e3ebf7] bg-[#f8fbff] px-4 py-4">
                <p className="text-sm font-semibold text-[#2f476b]">
                  2. 관리자 계정 검증
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8aa0bf]">
                  현재 세션은 {roleLabel} 권한이며 계정 상태는 {statusLabel} 입니다.
                  권한 이상 시 재로그인 또는 관리자 권한 부여 여부를 확인합니다.
                </p>
              </div>
              <div className="rounded-[18px] border border-[#e3ebf7] bg-[#f8fbff] px-4 py-4">
                <p className="text-sm font-semibold text-[#2f476b]">
                  3. API/프록시 기준점 확인
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8aa0bf]">
                  클라이언트 기준 API 주소는 {publicApiBaseUrl}, 모니터링 기준 경로는{" "}
                  {monitoringBasePath} 입니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
