"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/rs-data";
import { login, startOidcLogin, type OidcProvider } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

/** 로그인 페이지: 성공 시 next 파라미터 또는 대시보드로 이동한다. */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoggingIn, errorMessage } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [oidcLoadingProvider, setOidcLoadingProvider] = useState<OidcProvider | null>(null);
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/")) {
      return next;
    }

    return "/dashboard";
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    try {
      await login({ email, password });
      router.replace(nextPath);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("로그인 처리 중 오류가 발생했습니다.");
    }
  }

  function handleOidcLogin(provider: OidcProvider) {
    setSubmitError(null);
    setOidcLoadingProvider(provider);
    startOidcLogin(provider, nextPath);
  }

  const isSubmitting = isLoggingIn || oidcLoadingProvider !== null;

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <section className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-zinc-900">로그인</h1>
        <p className="mt-2 text-sm text-zinc-500">
          인증이 필요한 페이지 접근 시 이 화면으로 이동합니다.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              required
            />
          </label>

          {(submitError || errorMessage) && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError ?? errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isLoggingIn ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="my-6 border-t border-zinc-200" />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleOidcLogin("maum-on-oidc")}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100"
          >
            {oidcLoadingProvider === "maum-on-oidc" ? "Google 이동 중..." : "Google로 로그인"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleOidcLogin("kakao")}
            className="rounded border border-zinc-300 bg-[#FEE500] px-4 py-2 text-sm text-zinc-900 hover:brightness-95 disabled:cursor-not-allowed disabled:brightness-95"
          >
            {oidcLoadingProvider === "kakao" ? "Kakao 이동 중..." : "Kakao로 로그인"}
          </button>
        </div>
      </section>
    </div>
  );
}
