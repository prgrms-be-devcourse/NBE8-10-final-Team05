"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  createMemberByAdmin,
  getAdminMembers,
  getMemberByIdForAdmin,
  revokeMemberSessionsByIdForAdmin,
  updateMemberProfileByIdForAdmin,
  updateMemberRoleByIdForAdmin,
  updateMemberStatusByIdForAdmin,
} from "@/lib/admin/member-admin-service";
import type {
  AdminMemberActionLogItem,
  AdminMemberDetail,
  AdminMemberLetterHistoryItem,
  AdminMemberListItem,
  AdminMemberListRes,
  AdminMemberPostHistoryItem,
  AdminMemberProviderFilter,
  AdminMemberReportHistoryItem,
  AdminMemberRole,
  AdminMemberStatus,
} from "@/lib/admin/member-admin-types";
import { toErrorMessage } from "@/lib/api/rs-data";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "ALL", label: "전체 상태" },
  { value: "ACTIVE", label: "정상" },
  { value: "BLOCKED", label: "차단" },
  { value: "WITHDRAWN", label: "탈퇴" },
] as const;
const ROLE_OPTIONS = [
  { value: "ALL", label: "전체 권한" },
  { value: "USER", label: "일반 회원" },
  { value: "ADMIN", label: "관리자" },
] as const;
const PROVIDER_OPTIONS: ReadonlyArray<{ value: AdminMemberProviderFilter; label: string }> = [
  { value: "ALL", label: "전체 계정" },
  { value: "LOCAL", label: "로컬 계정" },
  { value: "SOCIAL", label: "소셜 계정" },
];

const EMPTY_LIST: AdminMemberListRes = {
  members: [],
  totalPages: 0,
  totalElements: 0,
  currentPage: 0,
  isFirst: true,
  isLast: true,
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: AdminMemberStatus): string {
  if (status === "ACTIVE") {
    return "정상";
  }

  if (status === "BLOCKED") {
    return "차단";
  }

  if (status === "WITHDRAWN") {
    return "탈퇴";
  }

  return status;
}

function getRoleLabel(role: AdminMemberRole): string {
  if (role === "ADMIN") {
    return "관리자";
  }

  if (role === "USER") {
    return "일반 회원";
  }

  return role;
}

function getStatusTone(status: AdminMemberStatus): string {
  if (status === "BLOCKED") {
    return "bg-[#fff1f1] text-[#b45757]";
  }

  if (status === "WITHDRAWN") {
    return "bg-[#f3f4f6] text-[#65758b]";
  }

  return "bg-[#eefbf4] text-[#2d8c58]";
}

function getRoleTone(role: AdminMemberRole): string {
  if (role === "ADMIN") {
    return "bg-[#eef5ff] text-[#356ec9]";
  }

  return "bg-[#f7f9fc] text-[#64748b]";
}

function getProviderLabel(member: Pick<AdminMemberListItem, "socialAccount">): string {
  return member.socialAccount ? "소셜" : "로컬";
}

function getActionLabel(action: string): string {
  if (action === "BLOCK") {
    return "차단";
  }

  if (action === "UNBLOCK") {
    return "차단 해제";
  }

  if (action === "CHANGE_ROLE") {
    return "권한 변경";
  }

  if (action === "REVOKE_SESSIONS") {
    return "세션 만료";
  }

  return action;
}

function formatStateChange(beforeValue: string | null, afterValue: string | null): string {
  if (beforeValue && afterValue) {
    return `${beforeValue} -> ${afterValue}`;
  }

  if (afterValue) {
    return afterValue;
  }

  if (beforeValue) {
    return beforeValue;
  }

  return "상태 스냅샷 없음";
}

function getLetterDirectionLabel(direction: string): string {
  if (direction === "SENT") {
    return "보낸 편지";
  }

  if (direction === "RECEIVED") {
    return "받은 편지";
  }

  return direction;
}

export default function AdminMembersPage() {
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("ALL");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_OPTIONS)[number]["value"]>("ALL");
  const [providerFilter, setProviderFilter] = useState<AdminMemberProviderFilter>("ALL");
  const [page, setPage] = useState(0);
  const [listRevision, setListRevision] = useState(0);

  const [memberList, setMemberList] = useState<AdminMemberListRes>(EMPTY_LIST);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const [memberDetail, setMemberDetail] = useState<AdminMemberDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);

  const [editingNickname, setEditingNickname] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null);
  const [updateNoticeMessage, setUpdateNoticeMessage] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [roleDraft, setRoleDraft] = useState<AdminMemberRole>("USER");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [actionNoticeMessage, setActionNoticeMessage] = useState<string | null>(null);

  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createNickname, setCreateNickname] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [createNoticeMessage, setCreateNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMembers(): Promise<void> {
      setIsListLoading(true);
      setListErrorMessage(null);

      try {
        const data = await getAdminMembers({
          query: appliedQuery || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          role: roleFilter === "ALL" ? undefined : roleFilter,
          provider: providerFilter === "ALL" ? undefined : providerFilter,
          page,
          size: PAGE_SIZE,
        });

        if (cancelled) {
          return;
        }

        setMemberList(data);
        setSelectedMemberId((current) => {
          if (data.members.length === 0) {
            return null;
          }

          if (current && data.members.some((member) => member.id === current)) {
            return current;
          }

          return data.members[0].id;
        });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setMemberList(EMPTY_LIST);
        setSelectedMemberId(null);
        setListErrorMessage(toErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsListLoading(false);
        }
      }
    }

    void fetchMembers();

    return () => {
      cancelled = true;
    };
  }, [appliedQuery, listRevision, page, providerFilter, roleFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function fetchMemberDetail(): Promise<void> {
      if (selectedMemberId === null) {
        setMemberDetail(null);
        setEditingNickname("");
        setRoleDraft("USER");
        setActionReason("");
        setDetailErrorMessage(null);
        return;
      }

      setIsDetailLoading(true);
      setDetailErrorMessage(null);
      setUpdateErrorMessage(null);
      setUpdateNoticeMessage(null);
      setActionErrorMessage(null);
      setActionNoticeMessage(null);

      try {
        const detail = await getMemberByIdForAdmin(selectedMemberId);

        if (cancelled) {
          return;
        }

        setMemberDetail(detail);
        setEditingNickname(detail.nickname);
        setRoleDraft(detail.role);
        setActionReason("");
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setMemberDetail(null);
        setEditingNickname("");
        setRoleDraft("USER");
        setActionReason("");
        setDetailErrorMessage(toErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    }

    void fetchMemberDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedMemberId]);

  const summary = useMemo(() => {
    const activeCount = memberList.members.filter((member) => member.status === "ACTIVE").length;
    const blockedCount = memberList.members.filter((member) => member.status === "BLOCKED").length;
    const adminCount = memberList.members.filter((member) => member.role === "ADMIN").length;

    return [
      {
        label: "현재 페이지 회원",
        value: memberList.members.length,
        helper: `총 ${memberList.totalElements}명`,
      },
      {
        label: "정상 회원",
        value: activeCount,
        helper: "즉시 응대 가능",
      },
      {
        label: "차단 회원",
        value: blockedCount,
        helper: "운영 확인 필요",
      },
      {
        label: "관리자",
        value: adminCount,
        helper: "현재 페이지 기준",
      },
    ];
  }, [memberList.members, memberList.totalElements]);

  function applyUpdatedMemberDetail(updated: AdminMemberDetail): void {
    setMemberDetail(updated);
    setEditingNickname(updated.nickname);
    setRoleDraft(updated.role);
    setMemberList((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === updated.id
          ? {
              ...member,
              nickname: updated.nickname,
              role: updated.role,
              status: updated.status,
              randomReceiveAllowed: updated.randomReceiveAllowed,
              socialAccount: updated.socialAccount,
              createdAt: updated.createdAt,
              lastLoginAt: updated.lastLoginAt,
            }
          : member,
      ),
    }));
  }

  async function handleSaveNickname(): Promise<void> {
    if (!memberDetail) {
      return;
    }

    const nickname = editingNickname.trim();
    if (!nickname) {
      setUpdateErrorMessage("닉네임을 입력해 주세요.");
      return;
    }

    setIsSavingNickname(true);
    setUpdateErrorMessage(null);
    setUpdateNoticeMessage(null);

    try {
      const updated = await updateMemberProfileByIdForAdmin(memberDetail.id, { nickname });
      applyUpdatedMemberDetail(updated);
      setUpdateNoticeMessage(`회원 #${updated.id} 닉네임을 수정했습니다.`);
    } catch (error: unknown) {
      setUpdateErrorMessage(toErrorMessage(error));
    } finally {
      setIsSavingNickname(false);
    }
  }

  async function handleUpdateStatus(nextStatus: AdminMemberStatus): Promise<void> {
    if (!memberDetail) {
      return;
    }

    const reason = actionReason.trim();
    if (!reason) {
      setActionErrorMessage("차단/해제 사유를 입력해 주세요.");
      return;
    }

    setIsUpdatingStatus(true);
    setActionErrorMessage(null);
    setActionNoticeMessage(null);

    try {
      const updated = await updateMemberStatusByIdForAdmin(memberDetail.id, {
        status: nextStatus,
        reason,
        revokeSessions: nextStatus === "BLOCKED",
      });
      applyUpdatedMemberDetail(updated);
      setActionNoticeMessage(
        nextStatus === "BLOCKED"
          ? `회원 #${updated.id}를 차단하고 세션을 만료했습니다.`
          : `회원 #${updated.id} 차단을 해제했습니다.`,
      );
    } catch (error: unknown) {
      setActionErrorMessage(toErrorMessage(error));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleUpdateRole(): Promise<void> {
    if (!memberDetail) {
      return;
    }

    const reason = actionReason.trim();
    if (!reason) {
      setActionErrorMessage("권한 변경 사유를 입력해 주세요.");
      return;
    }

    setIsUpdatingRole(true);
    setActionErrorMessage(null);
    setActionNoticeMessage(null);

    try {
      const updated = await updateMemberRoleByIdForAdmin(memberDetail.id, {
        role: roleDraft,
        reason,
      });
      applyUpdatedMemberDetail(updated);
      setActionNoticeMessage(
        `회원 #${updated.id} 권한을 ${getRoleLabel(updated.role)}로 변경하고 세션을 만료했습니다.`,
      );
    } catch (error: unknown) {
      setActionErrorMessage(toErrorMessage(error));
    } finally {
      setIsUpdatingRole(false);
    }
  }

  async function handleRevokeSessions(): Promise<void> {
    if (!memberDetail) {
      return;
    }

    setIsRevokingSessions(true);
    setActionErrorMessage(null);
    setActionNoticeMessage(null);

    try {
      const updated = await revokeMemberSessionsByIdForAdmin(memberDetail.id, {
        reason: actionReason.trim() || undefined,
      });
      applyUpdatedMemberDetail(updated);
      setActionNoticeMessage(`회원 #${updated.id} refresh 세션을 만료했습니다.`);
    } catch (error: unknown) {
      setActionErrorMessage(toErrorMessage(error));
    } finally {
      setIsRevokingSessions(false);
    }
  }

  async function handleCreateMember(): Promise<void> {
    const email = createEmail.trim();
    const password = createPassword.trim();
    const nickname = createNickname.trim();

    if (!email || !password || !nickname) {
      setCreateErrorMessage("이메일, 비밀번호, 닉네임을 모두 입력해 주세요.");
      return;
    }

    setCreateErrorMessage(null);
    setCreateNoticeMessage(null);
    setIsCreating(true);

    try {
      const created = await createMemberByAdmin({
        email,
        password,
        nickname,
      });

      setCreateNoticeMessage(`회원 생성 완료: #${created.id} (${created.nickname})`);
      setCreateEmail("");
      setCreatePassword("");
      setCreateNickname("");
      setPage(0);
      setSelectedMemberId(created.id);
      setListRevision((current) => current + 1);
    } catch (error: unknown) {
      setCreateErrorMessage(toErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  function handleSearchSubmit(): void {
    setPage(0);
    setAppliedQuery(draftQuery.trim());
  }

  function handleResetFilters(): void {
    setDraftQuery("");
    setAppliedQuery("");
    setStatusFilter("ALL");
    setRoleFilter("ALL");
    setProviderFilter("ALL");
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
              Admin Members
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#223552]">
              회원 관리
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[#6e83a5]">
              검색부터 제재, 세션 만료, 권한 변경, 관련 이력 확인까지 한 화면에서 처리합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {summary.map((item) => (
              <div
                key={item.label}
                className="min-w-[140px] rounded-[22px] border border-[#dce7f8] bg-white px-4 py-3"
              >
                <p className="text-xs font-semibold tracking-[0.12em] text-[#8aa0c0] uppercase">
                  {item.label}
                </p>
                <p className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[#91a5c2]">{item.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row">
            <label className="flex h-12 flex-1 items-center gap-3 rounded-[16px] border border-[#dce7f8] bg-[#f9fbff] px-4 text-sm text-[#7b92b2]">
              <Search size={17} />
              <input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                placeholder="회원 ID, 이메일, 닉네임 검색"
                className="w-full bg-transparent text-[#2b4162] outline-none placeholder:text-[#9bb0ca]"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-[#4f8cf0] px-5 text-sm font-semibold text-white transition hover:bg-[#3f80eb]"
              >
                <Search size={16} />
                검색
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-12 items-center gap-2 rounded-[16px] border border-[#dce7f8] bg-white px-4 text-sm font-semibold text-[#5f7ca8] transition hover:bg-[#f7fbff]"
              >
                <RefreshCcw size={16} />
                초기화
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <FilterSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as (typeof STATUS_OPTIONS)[number]["value"]);
                setPage(0);
              }}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value as (typeof ROLE_OPTIONS)[number]["value"]);
                setPage(0);
              }}
              options={ROLE_OPTIONS}
            />
            <FilterSelect
              value={providerFilter}
              onChange={(value) => {
                setProviderFilter(value as AdminMemberProviderFilter);
                setPage(0);
              }}
              options={PROVIDER_OPTIONS}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
                회원 목록
              </h2>
              <p className="mt-2 text-sm text-[#89a0c1]">
                최신 가입 회원부터 정렬합니다. 필터를 바꾸면 운영 대상만 빠르게 좁힐 수 있습니다.
              </p>
            </div>
            <div className="rounded-full bg-[#eff5ff] px-4 py-2 text-sm font-semibold text-[#5f7ca8]">
              총 {memberList.totalElements}명
            </div>
          </div>

          {isListLoading ? (
            <div className="mt-6 rounded-[24px] bg-[#f7fbff] px-6 py-14 text-center text-[#5f7598]">
              회원 목록을 불러오는 중입니다.
            </div>
          ) : null}

          {!isListLoading && listErrorMessage ? (
            <div className="mt-6 rounded-[24px] border border-[#f2d5d5] bg-[#fff8f8] px-5 py-4 text-sm text-[#9a4b4b]">
              {listErrorMessage}
            </div>
          ) : null}

          {!isListLoading && !listErrorMessage && memberList.members.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#d8e5f7] bg-[#fbfdff] px-5 py-12 text-center text-[#7d92b0]">
              현재 조건에 맞는 회원이 없습니다.
            </div>
          ) : null}

          {!isListLoading && !listErrorMessage && memberList.members.length > 0 ? (
            <>
              <div className="mt-6 space-y-3">
                {memberList.members.map((member) => {
                  const active = selectedMemberId === member.id;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`block w-full rounded-[22px] border px-5 py-4 text-left transition ${
                        active
                          ? "border-[#7fb0f5] bg-[#f4f9ff] shadow-[0_24px_50px_-42px_rgba(77,119,176,0.55)]"
                          : "border-[#dce7f8] bg-white hover:border-[#bcd3f5] hover:bg-[#fbfdff]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[18px] font-semibold tracking-[-0.03em] text-[#223552]">
                              {member.nickname}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(member.status)}`}
                            >
                              {getStatusLabel(member.status)}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleTone(member.role)}`}
                            >
                              {getRoleLabel(member.role)}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm text-[#6780a6]">{member.email}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#8ca2c1]">
                            <MetaPill label={`ID #${member.id}`} />
                            <MetaPill label={getProviderLabel(member)} />
                            <MetaPill label={`가입 ${formatDateTime(member.createdAt)}`} />
                            <MetaPill
                              label={
                                member.lastLoginAt
                                  ? `최근 로그인 ${formatDateTime(member.lastLoginAt)}`
                                  : "로그인 기록 없음"
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#7f96b6]">
                          <span
                            className={`inline-flex h-2.5 w-2.5 rounded-full ${
                              member.randomReceiveAllowed ? "bg-[#44b675]" : "bg-[#d5dee9]"
                            }`}
                          />
                          랜덤 수신 {member.randomReceiveAllowed ? "허용" : "비허용"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-[20px] border border-[#dce7f8] bg-[#fbfdff] px-4 py-3">
                <p className="text-sm text-[#7389aa]">
                  {memberList.currentPage + 1} / {Math.max(memberList.totalPages, 1)} 페이지
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 0))}
                    disabled={memberList.isFirst}
                    className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
                      memberList.isFirst
                        ? "cursor-not-allowed bg-[#eef3f9] text-[#adc0d8]"
                        : "bg-white text-[#567398] ring-1 ring-[#dce7f8] hover:bg-[#f7fbff]"
                    }`}
                  >
                    <ChevronLeft size={16} />
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={memberList.isLast}
                    className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
                      memberList.isLast
                        ? "cursor-not-allowed bg-[#eef3f9] text-[#adc0d8]"
                        : "bg-white text-[#567398] ring-1 ring-[#dce7f8] hover:bg-[#f7fbff]"
                    }`}
                  >
                    다음
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf5ff] text-[#4f8cf0]">
                <Users size={19} />
              </div>
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
                  회원 상세
                </h2>
                <p className="mt-1 text-sm text-[#89a0c1]">
                  계정 상태, 운영 조치, 관련 콘텐츠 이력을 함께 확인합니다.
                </p>
              </div>
            </div>

            {isDetailLoading ? (
              <div className="mt-6 rounded-[22px] bg-[#f7fbff] px-5 py-12 text-center text-[#6780a6]">
                회원 상세를 불러오는 중입니다.
              </div>
            ) : null}

            {!isDetailLoading && detailErrorMessage ? (
              <div className="mt-6 rounded-[22px] border border-[#f2d5d5] bg-[#fff8f8] px-5 py-4 text-sm text-[#9a4b4b]">
                {detailErrorMessage}
              </div>
            ) : null}

            {!isDetailLoading && !detailErrorMessage && !memberDetail ? (
              <div className="mt-6 rounded-[22px] border border-dashed border-[#d8e5f7] bg-[#fbfdff] px-5 py-12 text-center text-[#7d92b0]">
                목록에서 회원을 선택하면 상세 정보가 표시됩니다.
              </div>
            ) : null}

            {!isDetailLoading && memberDetail ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-[24px] bg-[#f7fbff] px-5 py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[26px] font-semibold tracking-[-0.04em] text-[#223552]">
                      {memberDetail.nickname}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(memberDetail.status)}`}
                    >
                      {getStatusLabel(memberDetail.status)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleTone(memberDetail.role)}`}
                    >
                      {getRoleLabel(memberDetail.role)}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-sm text-[#6680a5]">{memberDetail.email}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="회원 ID" value={`#${memberDetail.id}`} />
                  <DetailRow label="계정 유형" value={getProviderLabel(memberDetail)} />
                  <DetailRow label="가입일" value={formatDateTime(memberDetail.createdAt)} />
                  <DetailRow label="수정일" value={formatDateTime(memberDetail.modifiedAt)} />
                  <DetailRow
                    label="최근 로그인"
                    value={formatDateTime(memberDetail.lastLoginAt)}
                  />
                  <DetailRow
                    label="랜덤 수신"
                    value={memberDetail.randomReceiveAllowed ? "허용" : "비허용"}
                  />
                </div>

                <div className="rounded-[20px] border border-[#dce7f8] bg-[#fbfdff] px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#38547b]">
                    <ShieldCheck size={16} />
                    연결된 provider
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {memberDetail.connectedProviders.length > 0 ? (
                      memberDetail.connectedProviders.map((provider) => (
                        <span
                          key={provider}
                          className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8]"
                        >
                          {provider}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#8ca2c1]">연결된 소셜 provider가 없습니다.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#dce7f8] bg-white px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-[#38547b]">운영 조치</p>
                    <p className="text-sm text-[#7f96b6]">
                      차단/권한 변경은 사유를 남기고, 세션 만료는 즉시 적용합니다.
                    </p>
                  </div>

                  <textarea
                    value={actionReason}
                    onChange={(event) => setActionReason(event.target.value)}
                    placeholder="운영 사유를 입력해 주세요. 예: 신고 누적, 권한 정리, 비정상 로그인 대응"
                    className="mt-4 min-h-[110px] w-full rounded-[14px] border border-[#dce7f8] bg-[#f9fbff] px-4 py-3 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                  />

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <select
                      value={roleDraft}
                      onChange={(event) => setRoleDraft(event.target.value as AdminMemberRole)}
                      className="h-11 rounded-[12px] border border-[#dce7f8] bg-[#f9fbff] px-3 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    >
                      {ROLE_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleUpdateRole()}
                      disabled={isUpdatingRole || roleDraft === memberDetail.role}
                      className={`rounded-[12px] px-4 text-sm font-semibold text-white transition ${
                        isUpdatingRole || roleDraft === memberDetail.role
                          ? "cursor-not-allowed bg-[#b6c9e7]"
                          : "bg-[#5974d8] hover:bg-[#4866d4]"
                      }`}
                    >
                      {isUpdatingRole ? "권한 변경 중..." : "권한 변경"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRevokeSessions()}
                      disabled={isRevokingSessions}
                      className={`rounded-[12px] px-4 text-sm font-semibold transition ${
                        isRevokingSessions
                          ? "cursor-not-allowed bg-[#eef3f9] text-[#adc0d8]"
                          : "bg-white text-[#567398] ring-1 ring-[#dce7f8] hover:bg-[#f7fbff]"
                      }`}
                    >
                      {isRevokingSessions ? "세션 만료 중..." : "세션 만료"}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdateStatus(
                          memberDetail.status === "BLOCKED" ? "ACTIVE" : "BLOCKED",
                        )
                      }
                      disabled={isUpdatingStatus || memberDetail.status === "WITHDRAWN"}
                      className={`rounded-[12px] px-4 py-2 text-sm font-semibold text-white transition ${
                        isUpdatingStatus || memberDetail.status === "WITHDRAWN"
                          ? "cursor-not-allowed bg-[#b6c9e7]"
                          : memberDetail.status === "BLOCKED"
                            ? "bg-[#2d8c58] hover:bg-[#26784b]"
                            : "bg-[#d46b6b] hover:bg-[#c75a5a]"
                      }`}
                    >
                      {isUpdatingStatus
                        ? "처리 중..."
                        : memberDetail.status === "BLOCKED"
                          ? "차단 해제"
                          : "차단 + 세션 만료"}
                    </button>
                    {memberDetail.status === "WITHDRAWN" ? (
                      <span className="inline-flex items-center rounded-[12px] bg-[#f4f6f8] px-3 py-2 text-xs text-[#7f96b6]">
                        탈퇴 회원은 이 화면에서 차단/해제를 지원하지 않습니다.
                      </span>
                    ) : null}
                  </div>

                  {actionErrorMessage ? (
                    <p className="mt-3 rounded-[12px] border border-[#f3d0d0] bg-[#fff8f8] px-3 py-2 text-sm text-[#9a4b4b]">
                      {actionErrorMessage}
                    </p>
                  ) : null}
                  {actionNoticeMessage ? (
                    <p className="mt-3 rounded-[12px] border border-[#d5ead8] bg-[#f1fbf2] px-3 py-2 text-sm text-[#3e6f49]">
                      {actionNoticeMessage}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[20px] border border-[#dce7f8] bg-white px-4 py-4">
                  <label className="text-xs font-semibold tracking-[0.12em] text-[#7d93b4] uppercase">
                    닉네임 수정
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={editingNickname}
                      onChange={(event) => setEditingNickname(event.target.value)}
                      className="h-11 flex-1 rounded-[12px] border border-[#dce7f8] bg-[#f9fbff] px-3 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveNickname()}
                      disabled={isSavingNickname}
                      className={`rounded-[12px] px-4 text-sm font-semibold text-white transition ${
                        isSavingNickname
                          ? "cursor-not-allowed bg-[#b6c9e7]"
                          : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                      }`}
                    >
                      {isSavingNickname ? "저장 중..." : "저장"}
                    </button>
                  </div>
                  {updateErrorMessage ? (
                    <p className="mt-3 rounded-[12px] border border-[#f3d0d0] bg-[#fff8f8] px-3 py-2 text-sm text-[#9a4b4b]">
                      {updateErrorMessage}
                    </p>
                  ) : null}
                  {updateNoticeMessage ? (
                    <p className="mt-3 rounded-[12px] border border-[#d5ead8] bg-[#f1fbf2] px-3 py-2 text-sm text-[#3e6f49]">
                      {updateNoticeMessage}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[20px] border border-[#dce7f8] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#38547b]">감사 로그</p>
                      <p className="mt-1 text-sm text-[#7f96b6]">
                        최신 운영 조치부터 최근 20건까지 표시합니다.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#eff5ff] px-3 py-1 text-xs font-semibold text-[#5f7ca8]">
                      {memberDetail.actionLogs.length}건
                    </span>
                  </div>
                  <div className="mt-4">
                    <ActionLogList items={memberDetail.actionLogs} />
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#dce7f8] bg-white px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[#38547b]">신고 이력</p>
                    <p className="mt-1 text-sm text-[#7f96b6]">
                      회원이 접수한 신고와 회원 콘텐츠로 접수된 신고를 나눠서 표시합니다.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <HistoryPanel
                      title="접수한 신고"
                      count={memberDetail.submittedReports.length}
                    >
                      <ReportHistoryList
                        items={memberDetail.submittedReports}
                        emptyLabel="접수한 신고가 없습니다."
                      />
                    </HistoryPanel>
                    <HistoryPanel
                      title="회원 대상 신고"
                      count={memberDetail.receivedReports.length}
                    >
                      <ReportHistoryList
                        items={memberDetail.receivedReports}
                        emptyLabel="회원 콘텐츠 기준 신고 이력이 없습니다."
                      />
                    </HistoryPanel>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#dce7f8] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#38547b]">게시글 이력</p>
                      <p className="mt-1 text-sm text-[#7f96b6]">
                        최근 작성 게시글 5건을 운영 상태와 함께 표시합니다.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#eff5ff] px-3 py-1 text-xs font-semibold text-[#5f7ca8]">
                      {memberDetail.recentPosts.length}건
                    </span>
                  </div>
                  <div className="mt-4">
                    <PostHistoryList items={memberDetail.recentPosts} />
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#dce7f8] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#38547b]">편지 이력</p>
                      <p className="mt-1 text-sm text-[#7f96b6]">
                        최근 편지 송수신 5건을 상대 회원과 상태 기준으로 표시합니다.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#eff5ff] px-3 py-1 text-xs font-semibold text-[#5f7ca8]">
                      {memberDetail.recentLetters.length}건
                    </span>
                  </div>
                  <div className="mt-4">
                    <LetterHistoryList items={memberDetail.recentLetters} />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf5ff] text-[#4f8cf0]">
                <UserPlus size={19} />
              </div>
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
                  운영 보조 생성
                </h2>
                <p className="mt-1 text-sm text-[#89a0c1]">
                  테스트/운영 확인용 계정을 빠르게 생성합니다.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                placeholder="이메일"
                className="h-12 w-full rounded-[14px] border border-[#dce7f8] bg-[#f9fbff] px-4 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
              />
              <input
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
                placeholder="비밀번호"
                type="password"
                className="h-12 w-full rounded-[14px] border border-[#dce7f8] bg-[#f9fbff] px-4 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
              />
              <input
                value={createNickname}
                onChange={(event) => setCreateNickname(event.target.value)}
                placeholder="닉네임"
                className="h-12 w-full rounded-[14px] border border-[#dce7f8] bg-[#f9fbff] px-4 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
              />
            </div>

            {createErrorMessage ? (
              <p className="mt-4 rounded-[14px] border border-[#f3d0d0] bg-[#fff8f8] px-4 py-3 text-sm text-[#9a4b4b]">
                {createErrorMessage}
              </p>
            ) : null}
            {createNoticeMessage ? (
              <p className="mt-4 rounded-[14px] border border-[#d5ead8] bg-[#f1fbf2] px-4 py-3 text-sm text-[#3e6f49]">
                {createNoticeMessage}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void handleCreateMember()}
                disabled={isCreating}
                className={`rounded-[14px] px-5 py-2.5 text-sm font-semibold text-white transition ${
                  isCreating
                    ? "cursor-not-allowed bg-[#b6c9e7]"
                    : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                }`}
              >
                {isCreating ? "생성 중..." : "회원 생성"}
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-[16px] border border-[#dce7f8] bg-[#f9fbff] px-4 text-sm text-[#6780a6]">
      <Filter size={16} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-[#2b4162] outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-[#f4f7fb] px-3 py-1 text-xs font-medium text-[#758bab]">
      {label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dce7f8] bg-[#fbfdff] px-4 py-4">
      <p className="text-xs font-semibold tracking-[0.12em] text-[#7d93b4] uppercase">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-[#2f476b]">{value}</p>
    </div>
  );
}

function HistoryPanel({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[#e0e8f6] bg-[#fbfdff] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#38547b]">{title}</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6d86a8] ring-1 ring-[#dce7f8]">
          {count}건
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function HistoryEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[#d8e5f7] bg-white px-4 py-6 text-center text-sm text-[#7d92b0]">
      {label}
    </div>
  );
}

function ActionLogList({ items }: { items: AdminMemberActionLogItem[] }) {
  if (items.length === 0) {
    return <HistoryEmpty label="아직 기록된 운영 조치가 없습니다." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.logId}
          className="rounded-[18px] border border-[#e0e8f6] bg-[#fbfdff] px-4 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5f7ca8] ring-1 ring-[#dce7f8]">
                {getActionLabel(item.action)}
              </span>
              <span className="text-sm font-medium text-[#38547b]">{item.adminNickname}</span>
            </div>
            <span className="text-xs text-[#8ca2c1]">{formatDateTime(item.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm text-[#5f7598]">
            {formatStateChange(item.beforeValue, item.afterValue)}
          </p>
          <p className="mt-2 text-sm text-[#2f476b]">{item.memo ?? "메모 없음"}</p>
        </div>
      ))}
    </div>
  );
}

function ReportHistoryList({
  items,
  emptyLabel,
}: {
  items: AdminMemberReportHistoryItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <HistoryEmpty label={emptyLabel} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.relation}-${item.reportId}`}
          className="rounded-[16px] border border-[#e0e8f6] bg-white px-4 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/admin/reports/${item.reportId}`}
                className="text-sm font-semibold text-[#315fbb] hover:text-[#244f9f]"
              >
                신고 #{item.reportId}
              </a>
              <span className="rounded-full bg-[#f4f7fb] px-3 py-1 text-xs font-semibold text-[#758bab]">
                {item.targetType}
              </span>
            </div>
            <span className="text-xs text-[#8ca2c1]">{formatDateTime(item.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-[#2f476b]">
            사유 {item.reason} · 상태 {item.status}
          </p>
          <p className="mt-1 text-sm text-[#5f7598]">
            타깃 #{item.targetId}
            {item.processingAction ? ` · 조치 ${item.processingAction}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function PostHistoryList({ items }: { items: AdminMemberPostHistoryItem[] }) {
  if (items.length === 0) {
    return <HistoryEmpty label="최근 게시글 이력이 없습니다." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.postId}
          className="rounded-[16px] border border-[#e0e8f6] bg-[#fbfdff] px-4 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={`/stories/${item.postId}`}
              className="text-sm font-semibold text-[#315fbb] hover:text-[#244f9f]"
            >
              {item.title}
            </a>
            <span className="text-xs text-[#8ca2c1]">{formatDateTime(item.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-[#5f7598]">
            #{item.postId} · {item.category} · {item.status} · {item.resolutionStatus}
          </p>
        </div>
      ))}
    </div>
  );
}

function LetterHistoryList({ items }: { items: AdminMemberLetterHistoryItem[] }) {
  if (items.length === 0) {
    return <HistoryEmpty label="최근 편지 이력이 없습니다." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.letterId}
          className="rounded-[16px] border border-[#e0e8f6] bg-[#fbfdff] px-4 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={`/admin/letters/${item.letterId}`}
              className="text-sm font-semibold text-[#315fbb] hover:text-[#244f9f]"
            >
              {item.title}
            </a>
            <span className="text-xs text-[#8ca2c1]">{formatDateTime(item.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-[#2f476b]">
            {getLetterDirectionLabel(item.direction)} · 상대 {item.counterpartyNickname}
          </p>
          <p className="mt-1 text-sm text-[#5f7598]">
            #{item.letterId} · 상태 {item.status}
          </p>
        </div>
      ))}
    </div>
  );
}
