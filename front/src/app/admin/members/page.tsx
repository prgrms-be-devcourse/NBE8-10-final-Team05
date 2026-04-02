"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, UserRound } from "lucide-react";
import {
  createMemberByAdmin,
  getMemberByIdForAdmin,
  updateMemberProfileByIdForAdmin,
} from "@/lib/admin/member-admin-service";
import type { AdminMemberSummary } from "@/lib/admin/member-admin-types";
import { toErrorMessage } from "@/lib/api/rs-data";

function parseMemberId(raw: string): number | null {
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default function AdminMembersPage() {
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createNickname, setCreateNickname] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [createNoticeMessage, setCreateNoticeMessage] = useState<string | null>(null);

  const [lookupMemberIdInput, setLookupMemberIdInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupErrorMessage, setLookupErrorMessage] = useState<string | null>(null);

  const [selectedMember, setSelectedMember] = useState<AdminMemberSummary | null>(null);
  const [editingNickname, setEditingNickname] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null);
  const [updateNoticeMessage, setUpdateNoticeMessage] = useState<string | null>(null);

  const lookupMemberId = useMemo(
    () => parseMemberId(lookupMemberIdInput),
    [lookupMemberIdInput],
  );

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
      setCreatePassword("");
      setSelectedMember(created);
      setEditingNickname(created.nickname);
    } catch (error: unknown) {
      setCreateErrorMessage(toErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleLookupMember(): Promise<void> {
    if (lookupMemberId === null) {
      setLookupErrorMessage("조회할 회원 ID를 올바르게 입력해 주세요.");
      return;
    }

    setLookupErrorMessage(null);
    setUpdateErrorMessage(null);
    setUpdateNoticeMessage(null);
    setIsLookingUp(true);

    try {
      const member = await getMemberByIdForAdmin(lookupMemberId);
      setSelectedMember(member);
      setEditingNickname(member.nickname);
    } catch (error: unknown) {
      setSelectedMember(null);
      setLookupErrorMessage(toErrorMessage(error));
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleUpdateNickname(): Promise<void> {
    if (!selectedMember) {
      return;
    }

    const nickname = editingNickname.trim();
    if (!nickname) {
      setUpdateErrorMessage("닉네임을 입력해 주세요.");
      return;
    }

    setUpdateErrorMessage(null);
    setUpdateNoticeMessage(null);
    setIsSavingNickname(true);

    try {
      const updated = await updateMemberProfileByIdForAdmin(selectedMember.id, {
        nickname,
      });
      setSelectedMember(updated);
      setEditingNickname(updated.nickname);
      setUpdateNoticeMessage(`회원 #${updated.id} 닉네임이 수정되었습니다.`);
    } catch (error: unknown) {
      setUpdateErrorMessage(toErrorMessage(error));
    } finally {
      setIsSavingNickname(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#f7fbff] px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#86a2c7] uppercase">
          Member Admin
        </p>
        <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-[#223552]">
          회원 관리
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[#6e83a5]">
          레거시/관리자 멤버 API를 운영 화면에서 직접 사용할 수 있게 구성했습니다.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf5ff] text-[#4f8cf0]">
              <UserPlus size={19} />
            </div>
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
              회원 생성
            </h2>
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
        </div>

        <div className="rounded-[30px] bg-white px-6 py-6 shadow-[0_30px_60px_-52px_rgba(77,119,176,0.35)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eefbf4] text-[#37b36a]">
              <Search size={19} />
            </div>
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#223552]">
              회원 조회/수정
            </h2>
          </div>

          <div className="mt-5 flex gap-2">
            <input
              value={lookupMemberIdInput}
              onChange={(event) => setLookupMemberIdInput(event.target.value)}
              placeholder="회원 ID"
              inputMode="numeric"
              className="h-12 flex-1 rounded-[14px] border border-[#dce7f8] bg-[#f9fbff] px-4 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
            />
            <button
              type="button"
              onClick={() => void handleLookupMember()}
              disabled={isLookingUp}
              className={`rounded-[14px] px-4 text-sm font-semibold text-white transition ${
                isLookingUp
                  ? "cursor-not-allowed bg-[#b6c9e7]"
                  : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
              }`}
            >
              {isLookingUp ? "조회 중..." : "조회"}
            </button>
          </div>

          {lookupErrorMessage ? (
            <p className="mt-4 rounded-[14px] border border-[#f3d0d0] bg-[#fff8f8] px-4 py-3 text-sm text-[#9a4b4b]">
              {lookupErrorMessage}
            </p>
          ) : null}

          {selectedMember ? (
            <div className="mt-5 rounded-[18px] border border-[#dce7f8] bg-[#f8fbff] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2f476b]">
                <UserRound size={15} />
                회원 #{selectedMember.id}
              </div>
              <dl className="mt-3 grid gap-2 text-sm text-[#506582]">
                <div className="flex items-center justify-between gap-2">
                  <dt>이메일</dt>
                  <dd className="font-medium text-[#2f476b]">{selectedMember.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>랜덤 수신</dt>
                  <dd className="font-medium text-[#2f476b]">
                    {selectedMember.randomReceiveAllowed ? "허용" : "비허용"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>소셜 계정</dt>
                  <dd className="font-medium text-[#2f476b]">
                    {selectedMember.socialAccount ? "연동" : "미연동"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <label className="text-xs font-semibold text-[#6c82a5]">닉네임</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={editingNickname}
                    onChange={(event) => setEditingNickname(event.target.value)}
                    className="h-11 flex-1 rounded-[12px] border border-[#dce7f8] bg-white px-3 text-sm text-[#2b4162] outline-none focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                  />
                  <button
                    type="button"
                    onClick={() => void handleUpdateNickname()}
                    disabled={isSavingNickname}
                    className={`rounded-[12px] px-4 text-sm font-semibold text-white transition ${
                      isSavingNickname
                        ? "cursor-not-allowed bg-[#b6c9e7]"
                        : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
                    }`}
                  >
                    {isSavingNickname ? "저장 중..." : "닉네임 저장"}
                  </button>
                </div>
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
          ) : null}
        </div>
      </section>
    </div>
  );
}
