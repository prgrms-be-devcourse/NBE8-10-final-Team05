"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleAlert } from "lucide-react";
import BrandWordmark from "@/components/branding/BrandWordmark";
import MainHeader from "@/components/layout/MainHeader";
import { ApiError } from "@/lib/api/rs-data";
import { signup } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

function resolveSignupError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "회원가입 처리 중 오류가 발생했습니다.";
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hasRestored } = useAuthStore();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/")) {
      return next;
    }

    return "/dashboard";
  }, [searchParams]);

  const trimmedNickname = nickname.trim();
  const normalizedEmail = email.trim();
  const passwordsMatch = password === passwordConfirm;
  const canSubmit =
    trimmedNickname.length > 0 &&
    normalizedEmail.length > 0 &&
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    passwordsMatch &&
    !isSubmitting;

  useEffect(() => {
    if (hasRestored && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [hasRestored, isAuthenticated, nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (trimmedNickname.length === 0) {
      setSubmitError("닉네임을 입력해 주세요.");
      return;
    }

    if (trimmedNickname.length > 30) {
      setSubmitError("닉네임은 30자 이내로 입력해 주세요.");
      return;
    }

    if (normalizedEmail.length === 0) {
      setSubmitError("이메일을 입력해 주세요.");
      return;
    }

    if (password.length === 0) {
      setSubmitError("비밀번호를 입력해 주세요.");
      return;
    }

    if (!passwordsMatch) {
      setSubmitError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        email: normalizedEmail,
        password,
        nickname: trimmedNickname,
      });

      const nextSearchParams = new URLSearchParams({
        signup: "success",
        email: normalizedEmail,
      });
      if (nextPath.startsWith("/")) {
        nextSearchParams.set("next", nextPath);
      }

      router.replace(`/login?${nextSearchParams.toString()}`);
    } catch (error: unknown) {
      setSubmitError(resolveSignupError(error));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-4xl text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-[#1f3150] sm:text-[38px]">
            회원가입
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-[#7a8da9] sm:text-[17px]">
            마음온에서 익명의 위로와 기록을 시작해 보세요. 필요한 정보만 간단히 입력하면 됩니다.
          </p>
        </section>

        <section className="mx-auto mt-8 grid w-full max-w-5xl gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="home-hero rounded-[34px] px-7 py-8 text-white">
            <p className="text-sm font-semibold tracking-[0.18em] text-white/72 uppercase">welcome</p>
            <h2 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-white">
              익명과 온기를 지키는 시작
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-white/82">
              공개적인 고민 나누기, 비밀 편지, 나만의 일기까지. 마음을 안전하게 남길 수 있는 공간을
              준비했습니다.
            </p>

            <div className="mt-8 space-y-3">
              {[
                "닉네임은 자유롭게 정할 수 있고 언제든 바꿀 수 있어요.",
                "회원가입 후 로그인 페이지로 이동해 바로 이용할 수 있어요.",
                "가입 후에는 고민공유, 비밀편지, 일기 기능을 같은 계정으로 이어서 사용할 수 있어요.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 text-sm leading-6 text-white/88 backdrop-blur-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <section className="home-panel rounded-[34px] px-6 py-7 sm:px-8 sm:py-8">
            <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="signup-nickname"
                  className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                >
                  닉네임
                </label>
                <input
                  id="signup-nickname"
                  type="text"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={30}
                  autoComplete="nickname"
                  placeholder="익명으로 불릴 이름을 입력해 주세요"
                  className="mt-3 h-[62px] w-full rounded-[18px] border border-[#dce6f5] bg-[#fcfdff] px-5 text-[17px] text-[#2b4162] outline-none transition placeholder:text-[#a0b3ce] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                  required
                />
                <p className="mt-2 text-sm text-[#8ba0be]">공백 제외 30자 이내로 입력해 주세요.</p>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                >
                  이메일
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-3 h-[62px] w-full rounded-[18px] border border-[#dce6f5] bg-[#fcfdff] px-5 text-[17px] text-[#2b4162] outline-none transition placeholder:text-[#a0b3ce] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                  required
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="signup-password"
                    className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                  >
                    비밀번호
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="비밀번호를 입력해 주세요"
                    className="mt-3 h-[62px] w-full rounded-[18px] border border-[#dce6f5] bg-[#fcfdff] px-5 text-[17px] text-[#2b4162] outline-none transition placeholder:text-[#a0b3ce] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-password-confirm"
                    className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                  >
                    비밀번호 확인
                  </label>
                  <input
                    id="signup-password-confirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    autoComplete="new-password"
                    placeholder="한 번 더 입력해 주세요"
                    className="mt-3 h-[62px] w-full rounded-[18px] border border-[#dce6f5] bg-[#fcfdff] px-5 text-[17px] text-[#2b4162] outline-none transition placeholder:text-[#a0b3ce] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm leading-6 text-[#7d8fa8]">
                <CircleAlert size={16} className="mt-1 shrink-0" />
                <p>가입 후 자동 로그인되지는 않으며, 로그인 화면으로 이동해 바로 이어서 이용할 수 있어요.</p>
              </div>

              {submitError ? (
                <div className="rounded-[18px] border border-[#ffd7d7] bg-[#fff5f5] px-4 py-3 text-sm text-[#c24a4a]">
                  {submitError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-[58px] flex-1 items-center justify-center rounded-[18px] bg-[#edf2f9] text-[18px] font-semibold text-[#6b7f9c] transition hover:bg-[#e3ebf6]"
                >
                  로그인으로 가기
                </Link>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`inline-flex h-[58px] flex-[1.3] items-center justify-center rounded-[18px] text-[18px] font-semibold text-white transition ${
                    canSubmit
                      ? "bg-[#4f8cf0] shadow-[0_18px_34px_-24px_rgba(58,107,183,0.82)] hover:bg-[#3f80eb]"
                      : "cursor-not-allowed bg-[#b6c9e7]"
                  }`}
                >
                  {isSubmitting ? "가입 처리 중..." : "회원가입 완료"}
                </button>
              </div>
            </form>
          </section>
        </section>

        <section className="mx-auto mt-8 w-full max-w-5xl">
          <div className="rounded-[30px] border border-[#dce7fb] bg-[#eaf3ff] px-6 py-8 text-center shadow-[0_24px_48px_-36px_rgba(73,107,167,0.38)]">
            <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#4f8cf0]">
              이미 계정이 있으신가요?
            </p>
            <p className="mt-3 text-[15px] leading-7 text-[#6f84a5]">
              로그인 후 고민공유, 비밀 편지, 일기 기능을 바로 이어서 이용할 수 있어요.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 text-[17px] font-semibold text-[#4f8cf0] underline decoration-[#a9c5f5] underline-offset-4 transition hover:text-[#397ae6]"
            >
              로그인 하러가기
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <footer className="mt-8 rounded-[28px] bg-[#78A7E6] px-5 py-4 text-white/92">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandWordmark size="footer" tone="inverse" />
            <p className="text-sm">마음 온</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
