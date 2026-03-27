"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { toErrorMessage } from "@/lib/api/rs-data";
import { login, startOidcLogin, type OidcProvider } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

/** 로그인 페이지: 성공 시 next 파라미터 또는 대시보드로 이동한다. */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hasRestored, isLoggingIn, errorMessage } = useAuthStore();
  const signupEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(signupEmail);
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [oidcLoadingProvider, setOidcLoadingProvider] = useState<OidcProvider | null>(null);
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/")) {
      return next;
    }

    return "/dashboard";
  }, [searchParams]);
  const signupCompleted = searchParams.get("signup") === "success";
  const signupHref = useMemo(() => {
    if (nextPath === "/dashboard") {
      return "/signup";
    }

    return `/signup?next=${encodeURIComponent(nextPath)}`;
  }, [nextPath]);
  const normalizedEmail = email.trim();
  const canSubmit = normalizedEmail.length > 0 && password.length > 0 && !isLoggingIn;

  useEffect(() => {
    if (hasRestored && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [hasRestored, isAuthenticated, nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (normalizedEmail.length === 0) {
      setSubmitError("이메일을 입력해 주세요.");
      return;
    }

    if (password.length === 0) {
      setSubmitError("비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await login({ email: normalizedEmail, password });
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    }
  }

  function handleOidcLogin(provider: OidcProvider) {
    setSubmitError(null);
    setOidcLoadingProvider(provider);
    startOidcLogin(provider, nextPath);
  }

  const isSubmitting = isLoggingIn || oidcLoadingProvider !== null;

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-4xl text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-[#1f3150] sm:text-[38px]">
            로그인
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-[#7a8da9] sm:text-[17px]">
            고민공유와 비밀편지, 나의 일기를 이용하려면 로그인해 주세요.
          </p>
        </section>

        <section className="mx-auto mt-8 w-full max-w-2xl">
          <section className="home-panel rounded-[34px] px-6 py-7 sm:px-8 sm:py-8">
            {signupCompleted ? (
              <div className="mb-5 rounded-[18px] border border-[#d4eedb] bg-[#eefbf2] px-4 py-3 text-sm text-[#2f7d49]">
                회원가입이 완료되었습니다. 로그인 후 바로 이용할 수 있어요.
              </div>
            ) : null}

            <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="login-email"
                  className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                >
                  이메일
                </label>
                <div className="mt-3 flex h-[62px] items-center gap-3 rounded-[18px] border border-[#dce6f5] bg-[#fcfdff] px-4">
                  <Mail size={18} className="text-[#86a5cf]" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full bg-transparent text-[17px] text-[#2b4162] outline-none placeholder:text-[#a0b3ce]"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                >
                  비밀번호
                </label>
                <div className="mt-3 flex h-[62px] items-center gap-3 rounded-[18px] border border-[#dce6f5] bg-[#fcfdff] px-4">
                  <LockKeyhole size={18} className="text-[#86a5cf]" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="비밀번호를 입력해 주세요"
                    className="w-full bg-transparent text-[17px] text-[#2b4162] outline-none placeholder:text-[#a0b3ce]"
                    required
                  />
                </div>
              </div>

              {(submitError || errorMessage) && (
                <div className="rounded-[18px] border border-[#ffd7d7] bg-[#fff5f5] px-4 py-3 text-sm text-[#c24a4a]">
                  {submitError ?? errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || oidcLoadingProvider !== null}
                className={`inline-flex h-[58px] items-center justify-center rounded-[18px] text-[18px] font-semibold text-white transition ${
                  canSubmit && oidcLoadingProvider === null
                    ? "bg-[#4f8cf0] shadow-[0_18px_34px_-24px_rgba(58,107,183,0.82)] hover:bg-[#3f80eb]"
                    : "cursor-not-allowed bg-[#b6c9e7]"
                }`}
              >
                {isLoggingIn ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <div className="my-7 border-t border-[#e8f0fd]" />

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleOidcLogin("maum-on-oidc")}
                className="inline-flex h-[54px] items-center justify-center rounded-[16px] border border-[#d6e4fa] bg-white text-[16px] font-semibold text-[#3f5b84] transition hover:bg-[#f7fbff] disabled:cursor-not-allowed disabled:bg-[#f5f8fd] disabled:text-[#9eb0c9]"
              >
                {oidcLoadingProvider === "maum-on-oidc" ? "Google 이동 중..." : "Google로 로그인"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleOidcLogin("kakao")}
                className="inline-flex h-[54px] items-center justify-center rounded-[16px] border border-[#f3de6a] bg-[#FEE500] text-[16px] font-semibold text-[#3b3410] transition hover:brightness-95 disabled:cursor-not-allowed disabled:brightness-95"
              >
                {oidcLoadingProvider === "kakao" ? "Kakao 이동 중..." : "Kakao로 로그인"}
              </button>
            </div>

            <p className="mt-7 text-center text-sm text-[#7b8da9]">
              계정이 없다면{" "}
              <Link
                href={signupHref}
                className="font-semibold text-[#2f4b73] underline decoration-[#a9bddc] underline-offset-4"
              >
                회원가입
              </Link>
            </p>
          </section>
        </section>

        <section className="mx-auto mt-8 w-full max-w-2xl">
          <div className="rounded-[30px] border border-[#dce7fb] bg-[#eaf3ff] px-6 py-8 text-center shadow-[0_24px_48px_-36px_rgba(73,107,167,0.38)]">
            <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#4f8cf0]">
              처음 오셨나요?
            </p>
            <p className="mt-3 text-[15px] leading-7 text-[#6f84a5]">
              회원가입 후 로그인하면 고민공유, 비밀편지, 일기 기능을 모두 이용할 수 있어요.
            </p>
            <Link
              href={signupHref}
              className="mt-4 inline-flex items-center gap-2 text-[17px] font-semibold text-[#4f8cf0] underline decoration-[#a9c5f5] underline-offset-4 transition hover:text-[#397ae6]"
            >
              회원가입 하러가기
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />
      </div>
    </div>
  );
}
