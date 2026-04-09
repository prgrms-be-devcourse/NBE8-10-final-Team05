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
  getAdminMemberStatusLabel,
  getAdminRoleLabel,
  getMonitoringPrimaryActionLabel,
  getMonitoringStatusLabel,
} from "@/lib/admin/admin-settings-presenter";
import {
  getGrafanaHomeUrl,
  getK6GrafanaDashboardUrl,
  getPrometheusHomeUrl,
} from "@/lib/admin/grafana-dashboard";
import { redirectToLogout } from "@/lib/auth/auth-service";
import { getPublicApiBaseUrl } from "@/lib/runtime/deployment-env";

type StatusCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  toneClassName: string;
};

type InternalLinkCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
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
    </section>
  );
}

function InternalLinkCard({
  href,
  icon: Icon,
  title,
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

  function handleLogout(): void {
    redirectToLogout("/login");
  }

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
  const showObservabilityLinks = grafanaState !== "disabled";

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <h1 className="text-[34px] font-semibold tracking-[-0.05em] text-[#223552]">
          관리자 설정
        </h1>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <StatusCard
          icon={Shield}
          label="접근 권한"
          value={roleLabel}
          toneClassName="bg-[#edf5ff] text-[#4f8cf0]"
        />
        <StatusCard
          icon={Server}
          label="API 엔드포인트"
          value={publicApiBaseUrl}
          toneClassName="bg-[#eefbf4] text-[#2f9b61]"
        />
        <StatusCard
          icon={Gauge}
          label="Grafana 세션"
          value={getMonitoringStatusLabel(grafanaState)}
          toneClassName={monitoringToneClassName}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
              운영 화면
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InternalLinkCard
                href="/admin"
                icon={LayoutDashboard}
                title="대시보드"
                toneClassName="bg-[#edf5ff] text-[#4f8cf0]"
              />
              <InternalLinkCard
                href="/admin/members"
                icon={Users}
                title="회원 관리"
                toneClassName="bg-[#eefbf4] text-[#37b36a]"
              />
              <InternalLinkCard
                href="/admin/letters"
                icon={BookHeart}
                title="비밀편지 관리"
                toneClassName="bg-[#fff1f1] text-[#e17272]"
              />
              <InternalLinkCard
                href="/admin/reports"
                icon={Shield}
                title="신고 관리"
                toneClassName="bg-[#f4f0ff] text-[#8b64dc]"
              />
            </div>
          </section>

          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
                시스템 도구
              </h2>

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
                </section>
              )}
              {showObservabilityLinks ? (
                <ExternalLinkCard
                  href={getPrometheusHomeUrl()}
                  icon={Server}
                  title="Prometheus"
                  toneClassName="bg-[#fff6ea] text-[#d38a2f]"
                />
              ) : null}
              {showObservabilityLinks ? (
                <ExternalLinkCard
                  href={getK6GrafanaDashboardUrl()}
                  icon={BadgeCheck}
                  title="K6 대시보드"
                  toneClassName="bg-[#eef8ff] text-[#4d87c4]"
                />
              ) : null}
              <InternalLinkCard
                href="/settings"
                icon={UserRoundCog}
                title="내 계정 설정"
                toneClassName="bg-[#f4f0ff] text-[#8b64dc]"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
              관리자 계정
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
                    {member?.email ?? "-"}
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
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#dce7f8] bg-white px-4 py-3 text-sm font-semibold text-[#5d769b] transition hover:text-[#34527d]"
              >
                <LogOut size={15} />
                로그아웃
              </button>
            </div>
          </section>

        </div>
      </section>
    </div>
  );
}
