import Link from "next/link";

type StoryItem = {
  category: string;
  title: string;
  excerpt: string;
  age: string;
  empathyLabel: string;
  reactions: number;
  comments: number;
  accentClassName: string;
};

const heroSignals = [
  { label: "오늘 올라온 이야기", value: "128", note: "가볍게 둘러보기 좋은 새 글" },
  { label: "공감이 모인 순간", value: "54", note: "답장보다 먼저 도착한 공감" },
  { label: "조용한 키워드", value: "6", note: "오늘 많이 언급된 마음의 결" },
];

const storyTopics = ["#위로", "#관계", "#진로고민", "#혼자인기분", "#용기", "#쉼"];

const secretLetterSignals = [
  { label: "익명으로 적기", value: "부담 없이" },
  { label: "바다에 띄우기", value: "천천히 흘려보내기" },
  { label: "편지함으로 모으기", value: "나중에 다시 보기" },
];

const diaryPreviewItems = [
  "오늘 하루를 한 문장으로 남기기",
  "기분의 결을 색으로 저장하기",
  "다시 읽고 싶은 순간 표시하기",
];

const storyFeedItems: StoryItem[] = [
  {
    category: "연애",
    title: "짝사랑을 정리해야 할지, 한번은 꼭 말해봐야 할지 모르겠어요",
    excerpt:
      "좋아하는 마음이 길어질수록 일상도 같이 흔들리는 기분이에요. 지금은 끝내야 할지, 한 번쯤은 솔직해져야 할지 망설이고 있어요.",
    age: "3분전",
    empathyLabel: "따뜻한 한마디가 필요한 글",
    reactions: 28,
    comments: 9,
    accentClassName: "from-[#ffe7ef] to-[#fff8fb] text-[#cb6f94]",
  },
  {
    category: "진로",
    title: "열심히 가고는 있는데 이 길이 정말 내 방향인지 계속 흔들려요",
    excerpt:
      "남들은 다 앞서가는 것 같고, 저는 자꾸 돌아가는 느낌이 들어요. 지금 버티는 게 맞는지 조언을 듣고 싶어요.",
    age: "15분전",
    empathyLabel: "경험 기반 조언이 잘 어울리는 글",
    reactions: 17,
    comments: 12,
    accentClassName: "from-[#e8f1ff] to-[#f9fbff] text-[#5e83c1]",
  },
  {
    category: "친구",
    title: "오래 친했던 친구가 갑자기 멀게 느껴질 때 먼저 손 내밀어도 될까요",
    excerpt:
      "서로 바빠진 뒤로 대화가 툭툭 끊기기 시작했어요. 괜히 더 어색해질까 봐 다가가지 못하고 있어요.",
    age: "30분전",
    empathyLabel: "조심스러운 위로가 필요한 글",
    reactions: 21,
    comments: 7,
    accentClassName: "from-[#edf7ef] to-[#fbfffc] text-[#5b9a76]",
  },
  {
    category: "가족",
    title: "부모님 기대가 버거운데 실망시키고 싶지 않아서 더 답답해요",
    excerpt:
      "잘하고 싶다는 마음은 있는데, 점점 제 선택보다 기대를 먼저 생각하게 돼요. 숨이 막히는 날이 많아졌어요.",
    age: "1시간전",
    empathyLabel: "천천히 읽히는 공감 글",
    reactions: 33,
    comments: 11,
    accentClassName: "from-[#fff4df] to-[#fffbf3] text-[#c48a45]",
  },
  {
    category: "일상",
    title: "별일 없는데도 하루가 자꾸 무겁게 가라앉는 기분이 들어요",
    excerpt:
      "특별히 힘든 일이 있었던 건 아닌데, 계속 멍하고 아무것도 하고 싶지 않은 날이 길어지고 있어요.",
    age: "2시간전",
    empathyLabel: "조용히 머물다 가도 되는 글",
    reactions: 41,
    comments: 15,
    accentClassName: "from-[#eef4fb] to-[#fdfefe] text-[#6b89b2]",
  },
  {
    category: "학교",
    title: "내가 좋아하는 속도로 가고 싶은데 자꾸 비교 때문에 조급해져요",
    excerpt:
      "남들보다 늦는 것 같을 때마다 제 리듬을 잃어버려요. 나답게 가는 방법을 다시 찾고 싶어요.",
    age: "3시간전",
    empathyLabel: "응원이 힘이 되는 글",
    reactions: 19,
    comments: 6,
    accentClassName: "from-[#efe8ff] to-[#fbf9ff] text-[#8a6ac7]",
  },
];

function BottleSymbol() {
  return (
    <div className="relative h-32 w-24">
      <div className="absolute left-1/2 top-0 h-7 w-8 -translate-x-1/2 rounded-t-xl border-2 border-white/70 bg-white/20" />
      <div className="absolute left-1/2 top-4 h-24 w-16 -translate-x-1/2 rounded-[2rem_2rem_1.1rem_1.1rem] border-2 border-white/70 bg-white/15 shadow-[0_18px_40px_-18px_rgba(13,37,67,0.45)]" />
      <div className="absolute left-1/2 top-12 h-9 w-7 -translate-x-1/2 rounded-sm bg-white/85" />
      <div className="absolute left-1/2 top-[3.65rem] h-1 w-7 -translate-x-1/2 bg-[#78a7e6]" />
    </div>
  );
}

function StoryCard({ item }: { item: StoryItem }) {
  return (
    <article className="home-card group rounded-[24px] px-5 py-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold ${item.accentClassName}`}
        >
          {item.category}
        </div>
        <span className="text-xs font-medium text-slate-400">{item.age}</span>
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-7 tracking-[-0.03em] text-slate-900">
        {item.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{item.excerpt}</p>

      <div className="mt-5 rounded-[18px] bg-[#f4f8ff] px-4 py-3 text-sm font-medium text-slate-600">
        {item.empathyLabel}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
        <span>공감 {item.reactions}</span>
        <span>이야기 {item.comments}</span>
      </div>
    </article>
  );
}

function SideSignalPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--border-soft)] bg-white/80 px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
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

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_320px] lg:items-center">
              <div className="flex flex-col items-start gap-6 text-left">
                <div className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                  오늘의 마음을 살피는 메인 홈
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
                    말하지 못한 마음이
                    <br />
                    조용히 놓여도 괜찮은 곳
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
                    무거운 하루를 흘려보내고, 비슷한 결의 고민을 천천히 읽으며
                    오늘의 마음이 덜 외로워지는 랜딩 화면입니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="#stories"
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#5f86cc] transition hover:bg-[#f2f7ff]"
                  >
                    오늘의 이야기 둘러보기
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-full border border-white/35 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/16"
                  >
                    로그인하고 마음 남기기
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  {storyTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/88"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center rounded-[30px] border border-white/18 bg-white/10 px-6 py-7 shadow-[0_24px_48px_-28px_rgba(24,46,87,0.55)] backdrop-blur-md">
                  <BottleSymbol />
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {heroSignals.map((signal) => (
                    <div
                      key={signal.label}
                      className="rounded-[24px] border border-white/16 bg-white/12 px-5 py-4 shadow-[0_22px_44px_-30px_rgba(24,46,87,0.55)] backdrop-blur-md"
                    >
                      <p className="text-sm text-white/72">{signal.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                        {signal.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        {signal.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_320px]">
            <section
              id="stories"
              className="home-panel rounded-[32px] p-6 sm:p-8"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--brand-deep)]">
                      Shared Stories
                    </span>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                      고민 공유
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-slate-500">
                      감정을 빠르게 소비하지 않고, 읽는 사람이 천천히 머무를 수
                      있게 구성한 오늘의 이야기 피드입니다.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {storyTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1.5 text-sm text-slate-500"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {storyFeedItems.map((item) => (
                    <StoryCard key={`${item.category}-${item.title}`} item={item} />
                  ))}
                </div>

                <div className="flex flex-col gap-3 rounded-[26px] bg-[#f5f8ff] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--brand-deep)]">
                      오늘의 피드 큐레이션
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      지금은 실제 API 연결 전 단계라 대표 고민 카드와 읽기 흐름을
                      먼저 고정해 두었습니다.
                    </p>
                  </div>
                  <Link
                    href="#"
                    className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_18px_32px_-28px_rgba(73,105,160,0.55)]"
                  >
                    더 많은 이야기 보기
                  </Link>
                </div>
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <section className="home-panel rounded-[30px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--brand-deep)]">
                      Secret Letter
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                      비밀 편지
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[var(--brand-deep)]">
                    조용한 감정 정리
                  </span>
                </div>

                <div className="home-card mt-4 rounded-[26px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                        말보다 먼저 내려놓고 싶은 걱정이 있다면
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        편지 한 장에 감정을 적고, 파도에 실어 보내듯 가볍게
                        흘려보낼 수 있는 진입 카드입니다.
                      </p>
                    </div>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#eef5ff] shadow-[0_18px_36px_-28px_rgba(73,105,160,0.55)]">
                      <div className="relative h-10 w-8">
                        <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-t-md border border-[#84ace5] bg-white" />
                        <div className="absolute left-1/2 top-2 h-8 w-6 -translate-x-1/2 rounded-[1rem_1rem_0.7rem_0.7rem] border border-[#84ace5] bg-white" />
                        <div className="absolute left-1/2 top-4 h-3 w-3 -translate-x-1/2 rounded-sm bg-[#dbe9ff]" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {secretLetterSignals.map((signal) => (
                      <SideSignalPill
                        key={signal.label}
                        label={signal.label}
                        value={signal.value}
                      />
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/letters/write"
                      className="inline-flex rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-deep)]"
                    >
                      편지 쓰기
                    </Link>
                    <Link
                      href="/letters/mailbox"
                      className="inline-flex rounded-full border border-[var(--border-soft)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[var(--brand)]"
                    >
                      편지함 보기
                    </Link>
                  </div>
                </div>
              </section>

              <section
                id="diary"
                className="home-panel rounded-[30px] p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#6b89b2]">
                      My Diary
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                      나의 일기
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#f3f6fb] px-3 py-1 text-xs font-semibold text-[#6b89b2]">
                    준비 중
                  </span>
                </div>

                <div className="home-card mt-4 rounded-[26px] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-[20px] bg-[#6b89b2] text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(40,64,102,0.8)]">
                      오늘의 기록
                    </div>
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                        하루를 오래 붙잡지 않고도 남겨둘 수 있게
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        일기 공간은 아직 연결 전이지만, 메인에서는 기록의 톤과
                        흐름을 먼저 보여줍니다. 지금은 내 상태 확인 흐름으로
                        이어집니다.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[22px] bg-[#f5f8ff] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b89b2]">
                      Preview Prompts
                    </p>
                    <div className="mt-3 space-y-3">
                      {diaryPreviewItems.map((item, index) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 text-sm text-slate-600"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#6b89b2]">
                            {index + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/dashboard"
                      className="inline-flex rounded-full bg-[#6b89b2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5e7ba3]"
                    >
                      내 상태 확인
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex rounded-full border border-[#d3def2] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#6b89b2]"
                    >
                      로그인하기
                    </Link>
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
