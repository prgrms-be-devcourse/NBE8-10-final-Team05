"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Save, Settings2, Sparkles } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { fetchMe } from "@/lib/auth/auth-service";
import { patchAuthenticatedMember, useAuthStore } from "@/lib/auth/auth-store";
import {
  getNicknameSavedNotice,
  getRandomReceiveDescription,
  getRandomReceiveToggleNotice,
  toMemberSettingsErrorMessage,
} from "@/lib/member/settings-presenter";
import {
  getMemberSettings,
  toggleRandomReceiveAllowed,
  updateNickname,
} from "@/lib/member/settings-service";
import type { MemberSettings } from "@/lib/member/settings-types";

function LoadingCard() {
  return (
    <div className="home-panel rounded-[32px] px-8 py-8 animate-pulse">
      <div className="h-5 w-28 rounded-full bg-[#edf4ff]" />
      <div className="mt-6 h-14 rounded-[24px] bg-[#f4f8ff]" />
      <div className="mt-4 h-14 rounded-[24px] bg-[#f4f8ff]" />
    </div>
  );
}

export default function SettingsPage() {
  const { sessionRevision } = useAuthStore();
  const [settings, setSettings] = useState<MemberSettings | null>(null);
  const [nickname, setNickname] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isTogglingRandom, setIsTogglingRandom] = useState(false);

  const trimmedNickname = nickname.trim();
  const isNicknameChanged = useMemo(() => {
    if (!settings) {
      return false;
    }

    return trimmedNickname !== settings.nickname;
  }, [settings, trimmedNickname]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getMemberSettings();
      setSettings(response);
      setNickname(response.nickname);
    } catch (error: unknown) {
      setErrorMessage(toMemberSettingsErrorMessage(error));
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings, sessionRevision]);

  async function handleNicknameSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trimmedNickname.length === 0) {
      setErrorMessage("닉네임을 입력해 주세요.");
      return;
    }

    if (trimmedNickname.length > 30) {
      setErrorMessage("닉네임은 30자 이내로 입력해 주세요.");
      return;
    }

    if (!isNicknameChanged) {
      setNoticeMessage("변경된 닉네임이 없어요.");
      setErrorMessage(null);
      return;
    }

    setIsSavingNickname(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await updateNickname(trimmedNickname);
      setSettings(response);
      setNickname(response.nickname);
      patchAuthenticatedMember({
        nickname: response.nickname,
        email: response.email,
      });
      void fetchMe({ authFailureRedirect: false }).catch(() => undefined);
      setNoticeMessage(getNicknameSavedNotice());
    } catch (error: unknown) {
      setErrorMessage(toMemberSettingsErrorMessage(error));
    } finally {
      setIsSavingNickname(false);
    }
  }

  async function handleToggleRandomReceive() {
    if (!settings || isTogglingRandom) {
      return;
    }

    setIsTogglingRandom(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await toggleRandomReceiveAllowed();
      setSettings(response);
      setNoticeMessage(
        getRandomReceiveToggleNotice(response.randomReceiveAllowed),
      );
    } catch (error: unknown) {
      setErrorMessage(toMemberSettingsErrorMessage(error));
    } finally {
      setIsTogglingRandom(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800">
      <div className="mx-auto w-full max-w-6xl px-6 pt-7">
        <MainHeader />
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-12">
        <section className="home-hero rounded-[40px] px-8 py-10 text-white">
          <p className="text-sm font-semibold tracking-[0.24em] text-white/78">
            MY SETTINGS
          </p>
          <h1 className="mt-5 text-[48px] font-bold tracking-[-0.04em]">
            내 설정
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/88">
            계정 정보와 편지 수신 설정을 현재 지원 범위 안에서 관리할 수 있어요.
          </p>
        </section>

        {noticeMessage ? (
          <div className="mt-8 rounded-[28px] border border-[#d8e8ff] bg-white/92 px-5 py-4 text-sm font-medium text-[#41648c] shadow-[0_22px_44px_-34px_rgba(73,107,167,0.38)]">
            {noticeMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-[28px] border border-[#ffd8d8] bg-[#fff5f5] px-5 py-4 text-sm font-medium text-[#c45d5d] shadow-[0_22px_44px_-34px_rgba(196,93,93,0.28)]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {isLoading ? (
            <>
              <LoadingCard />
              <LoadingCard />
            </>
          ) : settings ? (
            <>
              <article className="home-panel rounded-[32px] px-8 py-8">
                <div className="flex items-center gap-3 text-[#4d6a8f]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#7aa6e6]">
                    <Mail size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-[#8ea8c8]">
                      ACCOUNT
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-[#25324a]">
                      계정 정보
                    </h2>
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-[#e1ecfb] bg-[#fbfdff] px-5 py-5">
                  <p className="text-sm font-semibold text-[#8aa0bd]">이메일</p>
                  <p className="mt-2 text-lg font-semibold text-[#2f4b73]">
                    {settings.email}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#7f93b0]">
                    현재 MVP에서는 이메일 변경을 지원하지 않습니다.
                  </p>
                </div>
              </article>

              <article className="home-panel rounded-[32px] px-8 py-8">
                <div className="flex items-center gap-3 text-[#4d6a8f]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#7aa6e6]">
                    <Settings2 size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-[#8ea8c8]">
                      PROFILE
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-[#25324a]">
                      프로필 설정
                    </h2>
                  </div>
                </div>

                <form className="mt-8" onSubmit={handleNicknameSave}>
                  <label
                    htmlFor="settings-nickname"
                    className="text-sm font-semibold text-[#7f93b0]"
                  >
                    닉네임
                  </label>
                  <input
                    id="settings-nickname"
                    type="text"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    maxLength={30}
                    className="mt-3 w-full rounded-[24px] border border-[#dbe7fb] bg-white px-5 py-4 text-lg font-semibold text-[#2f4b73] outline-none transition focus:border-[#8eb8f2] focus:ring-4 focus:ring-[#dfeeff]"
                    placeholder="닉네임을 입력해 주세요"
                    autoComplete="nickname"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#8aa0bd]">
                    <span>최대 30자까지 설정할 수 있어요.</span>
                    <span>{trimmedNickname.length}/30</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingNickname || !isNicknameChanged}
                    className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#5f95f2] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#4f86e7] disabled:cursor-not-allowed disabled:bg-[#b9d0f4]"
                  >
                    {isSavingNickname ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    닉네임 저장
                  </button>
                </form>

                <div className="mt-10 rounded-[28px] border border-[#e1ecfb] bg-[#fbfdff] px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[#2f4b73]">
                        <Sparkles size={18} className="text-[#7aa6e6]" />
                        <p className="text-base font-semibold">랜덤 편지 수신</p>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-[#7f93b0]">
                        {getRandomReceiveDescription(
                          settings.randomReceiveAllowed,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleToggleRandomReceive()}
                      disabled={isTogglingRandom}
                      aria-pressed={settings.randomReceiveAllowed}
                      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-all ${
                        settings.randomReceiveAllowed
                          ? "bg-[#7fb0f4]"
                          : "bg-[#cdd9ea]"
                      } ${isTogglingRandom ? "opacity-70" : "hover:scale-105"}`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
                          settings.randomReceiveAllowed
                            ? "translate-x-7"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </article>
            </>
          ) : (
            <article className="home-panel rounded-[32px] px-8 py-10 lg:col-span-2">
              <p className="text-xl font-bold text-[#2f4b73]">
                설정 정보를 불러오지 못했습니다.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#7f93b0]">
                잠시 후 다시 시도해 주세요.
              </p>
              <button
                type="button"
                onClick={() => void loadSettings()}
                className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d7e6fb] bg-white px-5 py-3 text-sm font-semibold text-[#4f6f98] transition hover:border-[#b8d1f6] hover:text-[#2f4b73]"
              >
                다시 불러오기
              </button>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
