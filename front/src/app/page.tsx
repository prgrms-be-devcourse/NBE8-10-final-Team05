import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          인증 UX 베이스라인
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          로그인/세션복원/보호 라우트 가드가 적용되어 있습니다. access 토큰이
          만료되어도 요청 시 refresh를 1회 수행하고 자동 재시도합니다.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            로그인 페이지
          </Link>
          <Link
            href="/dashboard"
            className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            보호 페이지
          </Link>
        </div>
      </section>
    </div>
  );
}
