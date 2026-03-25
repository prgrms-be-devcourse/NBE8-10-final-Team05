import Link from "next/link";

const storyShellItems = [
  { category: "연애", title: "짝사랑, 전할까?", age: "3분전" },
  { category: "진로", title: "이 길이 맞을까?", age: "15분전" },
  { category: "친구", title: "너무 서운해요", age: "30분전" },
  { category: "연애", title: "자꾸 마음이 흔들려요", age: "1시간전" },
  { category: "진로", title: "비교가 멈추지 않아요", age: "2시간전" },
  { category: "친구", title: "어색해진 사이를 풀고 싶어요", age: "3시간전" },
];

function BottleSymbol() {
  return (
    <div className="relative h-28 w-20">
      <div className="absolute left-1/2 top-0 h-6 w-7 -translate-x-1/2 rounded-t-xl border-2 border-white/70 bg-white/20" />
      <div className="absolute left-1/2 top-4 h-20 w-14 -translate-x-1/2 rounded-[1.8rem_1.8rem_1rem_1rem] border-2 border-white/70 bg-white/15 shadow-[0_18px_40px_-18px_rgba(13,37,67,0.45)]" />
      <div className="absolute left-1/2 top-11 h-8 w-6 -translate-x-1/2 rounded-sm bg-white/80" />
      <div className="absolute left-1/2 top-[3.2rem] h-1 w-6 -translate-x-1/2 bg-[#78a7e6]" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="home-atmosphere min-h-screen text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="home-shell flex flex-col gap-4 rounded-[30px] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)] text-lg font-semibold text-white shadow-[0_12px_24px_-12px_rgba(55,108,188,0.8)]">
              온
            </div>
            <div>
              <p className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-800">
                마음온
              </p>
              <p className="mt-1 text-sm text-slate-400">
                오늘의 마음이 가벼워지는 곳
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
            <Link href="#stories" className="transition-colors hover:text-slate-900">
              고민공유
            </Link>
            <Link href="#diary" className="transition-colors hover:text-slate-900">
              나의 일기
            </Link>
            <Link
              href="/letters/write"
              className="transition-colors hover:text-slate-900"
            >
              비밀편지
            </Link>
            <Link
              href="/dashboard"
              className="transition-colors hover:text-slate-900"
            >
              내 정보
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[var(--border-soft)] bg-[#f6f9ff] px-4 py-2 text-slate-700 transition hover:border-[var(--brand)] hover:text-slate-900"
            >
              로그인
            </Link>
          </nav>
        </header>

        <main className="mt-4 flex flex-1 flex-col gap-4">
          <section className="home-hero relative overflow-hidden rounded-[38px] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
            <div className="pointer-events-none absolute -left-8 top-8 h-28 w-28 rounded-full bg-white/12 blur-2xl sm:h-36 sm:w-36" />
            <div className="pointer-events-none absolute bottom-0 right-8 h-36 w-36 rounded-full bg-[#9dc2f2]/30 blur-3xl" />
            <div className="relative flex flex-col items-center gap-8 text-center">
              <div className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                오늘의 마음을 살피는 메인 홈
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
                  마음온
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
                  무거운 하루를 흘려보내고, 다른 사람의 마음 이야기를 조용히
                  들여다보는 첫 화면입니다.
                </p>
              </div>
              <BottleSymbol />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_320px]">
            <section
              id="stories"
              className="home-panel rounded-[32px] p-6 sm:p-8"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                  고민 공유
                </h2>
                <p className="text-sm leading-6 text-slate-500">
                  오늘의 마음 이야기가 놓일 메인 피드 영역입니다.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {storyShellItems.map((item) => (
                  <article
                    key={`${item.category}-${item.title}`}
                    className="home-card rounded-[24px] px-5 py-4"
                  >
                    <p className="text-sm font-medium text-[var(--brand-deep)]">
                      [{item.category}]
                    </p>
                    <p className="mt-3 min-h-14 text-lg font-semibold leading-7 tracking-[-0.03em] text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-6 text-right text-sm text-slate-400">
                      {item.age}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <section className="home-panel rounded-[30px] p-6">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                  비밀 편지
                </h2>
                <div className="home-card mt-4 rounded-[24px] p-5">
                  <p className="text-sm leading-6 text-slate-600">
                    당신의 고민을 조용히 적어 바다로 보내는 메인 진입 카드
                    자리입니다.
                  </p>
                  <Link
                    href="/letters/write"
                    className="mt-5 inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--brand-deep)]"
                  >
                    편지 쓰기
                  </Link>
                </div>
              </section>

              <section
                id="diary"
                className="home-panel rounded-[30px] p-6"
              >
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                  나의 일기
                </h2>
                <div className="home-card mt-4 flex min-h-40 items-center justify-between gap-4 rounded-[24px] p-5">
                  <div className="flex h-24 w-20 items-center justify-center rounded-[20px] bg-[#6b89b2] text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(40,64,102,0.8)]">
                    오늘의 기록
                  </div>
                  <div className="flex-1 rounded-[18px] border border-dashed border-[#d3def2] bg-white/80 px-4 py-5 text-sm leading-6 text-slate-500">
                    일기 미리보기와 최근 기록 요약이 들어갈 영역입니다.
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </main>

        <footer className="mt-4 rounded-[28px] bg-[var(--brand)] px-6 py-4 text-sm text-white/90 shadow-[0_18px_40px_-30px_rgba(58,109,182,0.8)]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-lg font-semibold tracking-[-0.04em]">마음온</span>
            <span>마음을 잠시 내려놓는 첫 화면 레이아웃 셸</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
