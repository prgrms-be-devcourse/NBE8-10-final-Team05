"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useId, useState } from "react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { toErrorMessage } from "@/lib/api/rs-data";

const STORY_CATEGORIES = ["전체", "고민", "일상", "질문"] as const;
const STORY_SORTS = ["최신순", "조회순"] as const;
const LETTER_BOTTLE_OUTLINE_PATH =
  "M56.5 43L59.5 43L65 48.5L68.5 53Q70.3 49.4 75.5 49L80 55.5L77 59.5L94.5 76Q101.2 69.7 116.5 72Q133.5 76 142 88.5L172.5 127L181 131L182 135.5L135.5 182L133.5 182L131 181Q129.3 173.5 123.5 169L87.5 141L78 131.5L72 117.5L72 103.5L76 93.5L58.5 77Q58 80.5 53.5 80L49 75.5L49 73.5L53 68.5L43 59.5L43 56.5L56.5 43ZM58 45L45 58L45 60L53 65L55 67L67 55L61 47L58 45ZM74 51L51 74L51 76L55 78L78 56L76 53Q77 50 74 51ZM75 61L61 76L78 92L86 84L87 85Q76 92 73 108L74 119L81 133L127 170L135 164L128 172L132 179L135 180L180 134L173 129L172 128L164 135L170 128L138 87Q129 76 113 73Q100 73 94 78L90 81L92 78L75 61Z";

type StoryCategory = (typeof STORY_CATEGORIES)[number];
type StorySort = (typeof STORY_SORTS)[number];
type BackendPostCategory = "DAILY" | "WORRY" | "QUESTION";

type StoryCategoryFilter = Exclude<StoryCategory, "전체">;

type CommunityStory = {
  id: number;
  category: StoryCategoryFilter;
  title: string;
  timeAgo: string;
  createdAt: string;
  createdAtMs: number;
  viewCount: number;
};

type PostListItem = {
  id: number;
  title: string;
  viewCount: number;
  createDate: string;
  modifyDate: string;
  thumbnail: string | null;
  category: BackendPostCategory;
  nickname: string;
};

type PostSlice = {
  content: PostListItem[];
};

const API_CATEGORY_TO_FILTER: Record<BackendPostCategory, StoryCategoryFilter> = {
  DAILY: "일상",
  WORRY: "고민",
  QUESTION: "질문",
};

const FILTER_TO_API_CATEGORY: Record<StoryCategoryFilter, BackendPostCategory> = {
  고민: "WORRY",
  일상: "DAILY",
  질문: "QUESTION",
};

const STORY_CARD_THEMES: Record<
  CommunityStory["category"],
  { hero: string; badge: string; avatar: string }
> = {
  고민: {
    hero: "from-[#f9d8e7] to-[#fff1f6]",
    badge: "bg-white/78 text-[#a34f74]",
    avatar: "bg-[#fbe4ec] text-[#a34f74]",
  },
  일상: {
    hero: "from-[#dde8ff] to-[#f3f7ff]",
    badge: "bg-white/78 text-[#4f6fa8]",
    avatar: "bg-[#e7efff] text-[#4f6fa8]",
  },
  질문: {
    hero: "from-[#d9f0e6] to-[#effaf4]",
    badge: "bg-white/78 text-[#4f8d6b]",
    avatar: "bg-[#e2f4ea] text-[#4f8d6b]",
  },
};

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "방금 전";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

function mapPostToCommunityStory(post: PostListItem): CommunityStory {
  const createdAt = new Date(post.createDate);

  return {
    id: post.id,
    category: API_CATEGORY_TO_FILTER[post.category] ?? "고민",
    title: post.title,
    timeAgo: formatRelativeTime(post.createDate),
    createdAt: post.createDate,
    createdAtMs: Number.isNaN(createdAt.getTime()) ? 0 : createdAt.getTime(),
    viewCount: post.viewCount,
  };
}

export default function StoriesPage() {
  const [activeCategory, setActiveCategory] = useState<StoryCategory>("전체");
  const [activeSort, setActiveSort] = useState<StorySort>("최신순");
  const [query, setQuery] = useState("");
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const diaryHref = isAuthenticated ? "/dashboard" : "/login";
  const lettersWriteHref = isAuthenticated
    ? "/letters/write"
    : "/login?next=%2Fletters%2Fwrite";
  const lettersMailboxHref = isAuthenticated
    ? "/letters/mailbox"
    : "/login?next=%2Fletters%2Fmailbox";
  const storyWriteHref = isAuthenticated ? "/stories/write" : "/login?next=%2Fstories%2Fwrite";
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    async function fetchStories(): Promise<void> {
      setIsLoadingStories(true);
      setStoriesError(null);

      try {
        const params = new URLSearchParams({
          page: "0",
          size: "30",
        });

        const trimmedQuery = deferredQuery.trim();
        if (trimmedQuery.length > 0) {
          params.set("title", trimmedQuery);
        }

        if (activeCategory !== "전체") {
          params.set("category", FILTER_TO_API_CATEGORY[activeCategory]);
        }

        const slice = await requestData<PostSlice>(`/api/v1/posts?${params.toString()}`, {
          skipAuth: true,
          retryOnAuthFailure: false,
          authFailureRedirect: false,
        });

        if (cancelled) {
          return;
        }

        setStories(slice.content.map(mapPostToCommunityStory));
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setStories([]);
        setStoriesError(toErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsLoadingStories(false);
        }
      }
    }

    void fetchStories();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, deferredQuery]);

  const visibleStories = [...stories].sort((a, b) => {
    if (activeSort === "조회순") {
      return b.viewCount - a.viewCount;
    }

    return b.createdAtMs - a.createdAtMs;
  });

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-5xl rounded-[34px] bg-[#78A7E6] px-5 py-6 shadow-[0_28px_60px_-40px_rgba(73,107,167,0.5)] sm:px-7">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {STORY_CATEGORIES.map((category) => {
              const active = category === activeCategory;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`min-w-[108px] rounded-[14px] px-5 py-3 text-lg font-semibold transition ${
                    active
                      ? "bg-[#4b81c7] text-white shadow-[0_14px_22px_-18px_rgba(31,60,102,0.9)]"
                      : "bg-white text-[#223556] hover:bg-[#f7fbff]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-8 w-full max-w-5xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#233552] sm:text-[32px]">
                고민 공유
              </h1>
              <p className="mt-1 text-lg text-[#5a7093]">오늘의 마음 이야기</p>
            </div>

          </div>

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border-2 border-[#8ab6ef] bg-white px-4 py-3 shadow-[0_14px_28px_-26px_rgba(73,107,167,0.9)]">
                <SearchIcon />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="제목 검색"
                  className="w-full bg-transparent text-base text-[#2b4162] outline-none placeholder:text-[#9ab0cc]"
                />
              </label>
              <button
                type="button"
                className="inline-flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] border-2 border-[#8ab6ef] bg-white text-[#769fd9] shadow-[0_14px_28px_-26px_rgba(73,107,167,0.9)]"
                aria-label="필터"
              >
                <FilterIcon />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#506582]">
              {STORY_SORTS.map((sort) => {
                const active = sort === activeSort;

                return (
                  <button
                    key={sort}
                    type="button"
                    onClick={() => setActiveSort(sort)}
                    className={`rounded-full px-4 py-2 transition ${
                      active ? "bg-[#dce9ff] text-[#35537e]" : "text-[#6f84a5] hover:bg-[#edf5ff]"
                    }`}
                  >
                    {sort}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_272px]">
            <div>
              {isLoadingStories ? (
                <div className="home-panel rounded-[24px] px-6 py-10 text-center text-[#6f84a5]">
                  고민 목록을 불러오는 중입니다.
                </div>
              ) : null}

              {!isLoadingStories && storiesError ? (
                <div className="home-panel rounded-[24px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-10 text-center">
                  <p className="text-[18px] font-semibold text-[#7a3d3d]">고민 목록을 불러오지 못했습니다.</p>
                  <p className="mt-2 text-sm text-[#9a4b4b]">{storiesError}</p>
                </div>
              ) : null}

              {!isLoadingStories && !storiesError && visibleStories.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleStories.map((story) => (
                    <CommunityStoryCard key={story.id} story={story} />
                  ))}
                </div>
              ) : null}

              {!isLoadingStories && !storiesError && visibleStories.length === 0 ? (
                <div className="home-panel rounded-[24px] px-6 py-10 text-center text-[#6f84a5]">
                  검색 결과가 없어요. 다른 카테고리나 키워드로 다시 찾아보세요.
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <Link
                href={storyWriteHref}
                className="block rounded-[26px] bg-[#5f95f3] px-5 py-5 text-white shadow-[0_26px_50px_-32px_rgba(55,99,174,0.85)] transition hover:-translate-y-0.5 hover:bg-[#568dee] hover:shadow-[0_32px_56px_-34px_rgba(55,99,174,0.9)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-white/10">
                    <ConcernShareIcon size={34} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[24px] font-semibold leading-tight tracking-[-0.03em] text-white">
                      고민 나누기
                    </span>
                  </div>
                </div>
              </Link>

              <section className="home-panel rounded-[22px] px-4 py-4">
                <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-[#233552]">비밀 편지</h3>
                <div className="mt-4 flex items-center gap-3">
                  <div className="rounded-[18px] bg-[#eff6ff] p-2.5 text-[#5f95f3]">
                    <LetterBottleIcon size={42} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={lettersWriteHref}
                      className="inline-flex items-center text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
                    >
                      편지 띄우기
                    </Link>
                    <Link
                      href={lettersMailboxHref}
                      className="inline-flex items-center text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
                    >
                      편지함 보기
                    </Link>
                  </div>
                </div>
              </section>

              <section id="diary" className="home-panel rounded-[22px] px-4 py-4">
                <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-[#233552]">나의 일기</h3>
                <div className="mt-4 flex items-center gap-3">
                  <div className="rounded-[18px] bg-[#eff6ff] p-2.5 text-[#5f95f3]">
                    <DiaryBookIcon size={42} />
                  </div>
                  <div>
                    <Link
                      href={diaryHref}
                      className="mt-1 inline-flex items-center text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
                    >
                      비밀일기 적기
                    </Link>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </section>

      </div>
    </div>
  );
}

function CommunityStoryCard({ story }: { story: CommunityStory }) {
  const theme = STORY_CARD_THEMES[story.category];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[12px] border border-[#dbe6f5] bg-white text-[#324763] shadow-[0_18px_34px_-24px_rgba(73,107,167,0.32)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_42px_-22px_rgba(73,107,167,0.42)]">
      <Link href={`/stories/${story.id}`} className="group flex h-full flex-col">
        <div className={`relative h-[118px] overflow-hidden border-b border-[#edf2fb] bg-gradient-to-br ${theme.hero}`}>
          <div className="absolute inset-x-5 top-4 flex items-center justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${theme.badge}`}>
              {story.category}
            </span>
            <span className="shrink-0 text-[12px] font-medium text-[#6f84a5]">{story.timeAgo}</span>
          </div>
          <div className="absolute left-5 bottom-5 space-y-2 opacity-85">
            <span className="block h-[4px] w-16 rounded-full bg-white/75" />
            <span className="block h-[4px] w-10 rounded-full bg-white/55" />
          </div>
          <div className="absolute -bottom-4 right-5 h-20 w-20 rounded-full bg-white/30" />
        </div>
        <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
          <h2 className="line-clamp-3 text-[18px] font-semibold leading-8 tracking-[-0.03em] text-[#223552] transition group-hover:text-[#33527d]">
            {story.title}
          </h2>
          <div className="mt-auto flex items-center gap-2 pt-6 text-[14px] text-[#7a8eab]">
            <span>{story.timeAgo}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5H20L14 12V18L10 20V12L4 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConcernShareIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 800 800" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M242.5 105L547.5 105L561.5 108L574 116.5L581 127.5L584 139.5V301.5Q581.1 319.1 569.5 328Q562.6 333.1 552.5 335H349.5L346 338.5L305 392.5L297.5 400Q291.7 404.7 279.5 403Q271.8 400.8 267 395.5L262 384.5V335H237.5L233.5 334Q222.7 330.8 216 323.5L207 305.5V134.5Q210.6 120.6 220.5 113L229.5 108L242.5 105ZM240 123L233 126L227 132L224 141V301L227 309Q231 315 239 317H280V384L285 386L289 385L339 319L341 317H553L558 315Q564 311 566 303V138L562 130Q558 124 551 123H240Z"
      />
      <path
        fill="currentColor"
        d="M314.5 170H485.5L490 173.5L492 178.5L488.5 186L482.5 188H317.5L310 184.5L308 177.5L312.5 171L314.5 170Z"
      />
      <path
        fill="currentColor"
        d="M314.5 207H485.5L490 210.5L492 215.5L490 222L485.5 224H313.5L310 221.5L308 214.5L312.5 208L314.5 207Z"
      />
      <path
        fill="currentColor"
        d="M313.5 244H402.5L407 246L409 252.5L407 259L402.5 261H313.5Q308.2 258.8 308 251.5L313.5 244Z"
      />
      <path
        fill="currentColor"
        d="M395.5 354L410.5 355L420.5 358Q435 364.5 444 376.5Q451 385.5 454 398.5Q452.5 404 455 405.5V431.5L452 445.5L446 457.5L432.5 472L414.5 481L397.5 483L379.5 479L362 468L352 454.5L347 442.5L345 433.5V403.5Q349.1 380.6 363.5 368L379.5 358L395.5 354ZM394 372Q382 375 375 382Q367 390 363 403V435Q365 446 372 453Q380 462 395 465L410 464L426 455Q434 447 437 434V404Q435 394 430 388Q423 379 413 374Q405 371 394 372Z"
      />
      <path
        fill="currentColor"
        d="M212.5 400L225.5 401L235.5 404Q249.4 409.6 258 420.5Q266.8 430.7 270 446.5V482.5Q265 505 249.5 517Q241.7 523.7 230.5 527L219.5 529H211.5L200.5 527L187.5 521L173 508.5Q163.9 498.1 161 481.5V447.5Q165.4 424.9 180.5 413L195.5 404L212.5 400ZM211 418L203 420L192 427Q181 436 178 453V477Q180 478 179 483L186 497Q194 507 210 511Q228 512 238 504Q249 495 253 478V453Q251 451 252 447L244 432Q238 424 229 420L221 418H211Z"
      />
      <path
        fill="currentColor"
        d="M581.5 400L594.5 401L604.5 404Q616.8 409.2 625 418.5Q634.1 428.4 638 443.5L639 448.5V480.5Q634.6 503.6 619.5 516Q606 528.5 580.5 529L569.5 527L557.5 522L541 507.5Q533.2 497.8 530 483.5Q531.7 477.2 529 475.5V453.5L530 452.5L531 441.5L537 427.5L550.5 412L566.5 403L581.5 400ZM579 418Q568 420 562 426Q554 432 550 441L547 451V479L548 484L557 500Q565 508 579 511L595 510L608 503Q615 497 619 488L622 474L621 449Q619 437 612 431Q605 423 595 419L579 418Z"
      />
      <path
        fill="currentColor"
        d="M386.5 493H413.5L414.5 494L432.5 496L451.5 501L478.5 513Q491.6 520.4 501 531.5Q507.9 539.1 510 551.5L510.5 591L551.5 549Q559.2 542.2 570.5 539H610.5Q627.3 542.7 637 553.5L646 568.5L649 583.5V685.5L648 689.5L643.5 694L639.5 695L633 691.5L631 687.5V580.5Q628.6 568.4 620.5 562L613.5 558L605.5 556H574.5Q560.6 561.1 553 572.5Q553.8 574.8 551.5 574L547 580L545 580Q546.1 582.7 543.5 582L528.5 598L525.5 600L521.5 605Q519.3 604.3 520 606.5L505.5 620H447.5L446 621.5Q446.5 638 456.5 645L465.5 649H535.5L561 623.5V622L569 615.5Q568.3 613.3 570.5 614L586 598.5V597L594.5 594L601 597.5L602 606.5L565 643.5V688.5L560.5 694L556.5 695L549 690.5L548 688.5V667H252.5L252 667.5V687.5L248.5 693L243.5 695L239.5 694L235 689.5L234 685.5V642.5L198 606.5V599.5L200.5 596L206.5 594Q215.5 596.4 220 603.5L221.5 606L225 608.5L230.5 615Q232.8 614.3 232 616.5L259 642.5L260.5 645L265.5 649H334.5Q343.8 647.3 348 640.5Q353.9 633.9 354 621.5L352.5 620H294.5L232.5 559L225.5 556H194.5Q180.8 558.3 174 567.5L169 579.5V687.5L165.5 693L160.5 695L156.5 694L152 689.5L151 685.5V583.5L154 568.5Q158.5 557.5 166.5 550Q175.4 541.9 189.5 539H229.5L243.5 545L263 563.5L289.5 591L290 549.5Q294.1 536.7 301 528L316.5 516L337.5 505L362.5 497L378.5 494H385.5L386.5 493ZM396 510L395 511H385L384 512L372 513L348 520L327 530L319 536Q310 542 307 554V603L310 604H335L336 603V564L337 562L344 557L349 558L353 564V602L356 604H371L372 611L371 630L369 638L364 648L365 649H436L431 639L428 625V610L429 609Q428 604 430 604H445L446 603V566L448 561L455 557L461 559L464 564V603L466 604H491L493 602V557L488 544Q480 534 470 528L447 518L423 512L396 510Z"
      />
    </svg>
  );
}

function LetterBottleIcon({ size = 56 }: { size?: number }) {
  const bottleBodyFilterId = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="40 40 145 145"
      fill="none"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
    >
      <g transform="translate(225 0) scale(-1 1)">
        <defs>
          <filter
            id={bottleBodyFilterId}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feMorphology in="SourceGraphic" operator="erode" radius="0.7" />
          </filter>
        </defs>
        <path
          fill="none"
          filter={`url(#${bottleBodyFilterId})`}
          d="M58 42L56 43L43 56L42 60L52 69L48 74L48 76L53 80Q58 81 59 78L75 94L71 104Q70 114 72 122L80 136L125 171L130 181L134 183L137 182L183 135L182 132L173 126L138 83Q130 74 117 71Q102 69 95 74L94 75L78 60L80 57L80 53L76 48Q70 48 69 52L66 49L60 42L58 42Z"
        />
        <path
          fill="none"
          d="M73.5 52Q76.8 50.9 76 53.5L77 55.5L54.5 77L52 76L52 73.5L73.5 52Z"
        />
        <path
          fill="none"
          d="M74.5 62L91 77.5L89 80.5Q91.2 84.2 93.5 79Q98.7 74.7 107.5 74L125 90.5L128 94.5Q122.7 96.7 124 105.5L124.5 107L109.5 85Q103.3 85.8 100.5 90L95.5 86Q85.9 92.9 83 106.5L87.5 112L117 131.5L135.5 160L138.5 161L146 158L147 155.5L144 148.5L145.5 149L152.5 152L156.5 147Q159.5 146.1 158 150.5L159 154.5L138.5 175L137 173.5L134 166.5Q137.8 164.8 134.5 163L130.5 164L88 129.5Q78 120.5 78 101.5L80 93.5L87 85.5L87 83L81.5 87L66 70.5L74.5 62Z"
        />
        <path
          fill="#fae093"
          d="M57.5 45L63 49.5L66 55.5L59 61.5L57.5 59L51 55L50 52.5L57.5 45Z"
        />
        <path
          fill="#fae093"
          d="M108.5 88L109 91.5Q106 92.5 107 97.5L108 100Q101 98.7 98.5 103L95 99.5L104.5 90L108.5 88Z"
        />
        <path
          fill="#fae093"
          d="M95.5 90L98 91.5L92 100.5L96 105.5L88.5 109Q85.5 108.5 86 104.5Q88.9 95.4 95.5 90Z"
        />
        <path
          fill="#fae093"
          d="M110 93L113 94.5L127 117.5L121.5 123L118.5 120L99 108L102.5 103Q108.5 104.5 110 101.5L110 93Z"
        />
        <path
          fill="#fae093"
          d="M129.5 119L157 136.5L157 140.5L151.5 148L142.5 144Q140.3 144.8 141 148.5L143 152.5L140 150.5L124 124.5L129.5 119Z"
        />
        <path
          fill="#600448"
          d={LETTER_BOTTLE_OUTLINE_PATH}
        />
        <path
          fill="#600448"
          d="M107.5 86Q111.5 85.5 112 88.5L125.5 110L126 107.5Q123.3 105.8 125 99.5L128.5 95Q134.8 93.8 136 97.5L137 102.5L135 110.5L132 114.5L144.5 116L152 121.5Q152.8 123.8 150.5 123Q145.6 115 132 117Q130.9 119.7 133.5 119L159 135.5L159 141.5L152.5 151L143.5 147L144 148.5L146 156.5Q143.8 160.8 136.5 160L115.5 129L84 107.5Q83.4 101.4 86 98.5L95.5 87L100.5 91L107.5 86ZM107 88L103 91L95 100L98 103L102 101L108 101Q106 93 110 90L107 88ZM96 90L87 101L86 108L89 109Q94 110 96 106Q98 107 97 105L93 102Q93 95 99 93L96 90ZM110 92L109 95L110 101Q109 103 104 102L94 110Q91 109 92 112L117 128L128 118L113 94L110 92ZM131 96L127 99Q126 109 130 115L132 113L135 105L134 99L131 96ZM129 119L122 127L119 129L119 131L137 158Q142 159 144 156L141 145L145 145L152 149Q157 145 158 138L155 134L131 119L129 119Z"
        />
      </g>
    </svg>
  );
}

const DIARY_BOOK_ICON_MARKUP = String.raw`<path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 379.5 44 L 378.5 46 L 379.5 44 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 191.5 50 L 194.5 54 L 191.5 50 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 164.5 59 L 173 59.5 L 164.5 60 L 164.5 59 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 335.5 73 L 342 73.5 L 335.5 74 L 335.5 73 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 351.5 87 L 350.5 89 L 351.5 87 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 357.5 96 L 358.5 98 L 357.5 96 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 168.5 100 L 173 100.5 L 168.5 101 L 168.5 100 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 341.5 102 L 342.5 104 L 341.5 102 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 348.5 110 L 349.5 112 L 348.5 110 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 218.5 113 L 219.5 115 L 218.5 113 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 305.5 114 L 304.5 116 L 305.5 114 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 348.5 160 L 349.5 162 L 348.5 160 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 208.5 162 L 204.5 167 L 208.5 162 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 355.5 167 L 356.5 169 L 355.5 167 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 402.5 291 L 403 294.5 L 402 294.5 L 402.5 291 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 342.5 298 L 340.5 301 L 342.5 298 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 357.5 305 L 356.5 307 L 357.5 305 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 348.5 314 L 347.5 316 L 348.5 314 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 392.5 320 L 391.5 322 L 392.5 320 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 221.5 322 L 222.5 324 L 221.5 322 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 389.5 324 L 382.5 332 L 389.5 324 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 351.5 344 L 354 344.5 L 351.5 345 L 351.5 344 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 69.5 414 L 68.5 416 L 69.5 414 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 285.5 437 L 286.5 439 L 285.5 437 Z " /><path fill="rgb(152,192,242)" stroke="rgb(152,192,242)" stroke-width="1" opacity="1" d="M 292.5 443 L 293.5 445 L 292.5 443 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 76.5 0 L 449.5 0 Q 457.1 1.9 461 7.5 L 464 13.5 L 464 277.5 L 461.5 281 L 453.5 282 L 449 276.5 L 449 16.5 L 447.5 15 L 130 15 L 130 391 L 447.5 391 L 449 389.5 L 449 308.5 L 452.5 304 L 459.5 303 L 464 307.5 L 464 392.5 L 458.5 402 L 451.5 406 L 447.5 406 L 440 413.5 L 435 426.5 L 435 435.5 Q 438.1 448.9 447 456.5 L 447 463.5 L 442.5 469 L 440.5 470 L 403 470 L 403 501.5 L 401 507.5 L 398.5 510 Q 395.8 512.8 389.5 512 L 366.5 494 L 346.5 511 L 339.5 512 L 332 506.5 L 331 503.5 L 331 470 L 80.5 470 Q 65.4 466.6 57 456.5 Q 50.5 449 48 437.5 L 48 96.5 L 51.5 92 L 56.5 91 L 61 93 L 63 97.5 L 63 154.5 L 65.5 157 L 82 172.5 Q 95.7 188.3 102 211.5 L 104 221.5 L 104 228.5 L 105 229.5 L 105 245.5 L 104 246.5 L 104 253.5 L 102 263.5 L 94 284.5 Q 83.5 304.5 66.5 318 L 63 320.5 L 63 398.5 L 64.5 399 L 78.5 392 L 115 391 L 115 15.5 L 114.5 15 L 77.5 15 Q 69.8 16.9 66 22.5 L 63 28.5 L 63 63.5 L 58.5 69 L 54.5 70 L 49 66.5 L 48 64.5 L 48 27.5 Q 50.9 13.9 60.5 7 Q 66.9 1.9 76.5 0 Z M 64 175 L 64 300 Q 77 289 84 271 L 88 259 L 89 248 L 90 247 L 89 222 L 84 205 Q 77 187 64 175 Z M 85 406 L 73 411 Q 65 416 63 426 Q 61 440 68 447 Q 73 452 82 455 L 331 455 L 331 407 L 331 406 L 319 406 L 317 408 L 317 446 L 315 449 L 310 452 L 302 451 L 282 434 L 260 452 L 252 451 L 246 445 L 246 407 L 246 406 L 85 406 Z M 261 406 L 261 431 L 274 421 L 279 419 Q 286 418 290 421 L 302 431 L 302 407 L 290 407 L 289 406 L 261 406 Z M 346 406 L 346 491 L 363 479 L 374 480 L 387 491 L 388 491 L 388 408 L 387 406 L 346 406 Z M 404 406 L 402 408 L 402 455 L 427 455 L 423 448 L 420 436 L 421 421 L 427 408 L 427 406 L 404 406 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 224.5 42 Q 229.3 42.3 231 45.5 L 232 47.5 L 232 111.5 Q 230.4 116.9 222.5 116 L 219 113.5 L 217 109.5 L 217 48.5 L 221.5 43 L 224.5 42 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 274.5 43 Q 281.8 42.8 284 47.5 L 307 107.5 L 307 111.5 L 303.5 116 L 297.5 117 L 293 113.5 L 289 102 L 264.5 102 L 263 103.5 L 260 112.5 L 256.5 116 L 251.5 117 L 246 112.5 L 246 106.5 L 248 100.5 L 270 45 L 274.5 43 Z M 277 70 L 270 85 L 271 88 L 283 88 L 277 70 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 326.5 43 L 348.5 44 Q 357.5 46.4 362 53.5 L 366 62.5 L 366 69.5 Q 364.1 78.1 358.5 83 L 352.5 87 L 350 87 L 352 91.5 L 365 105.5 L 366 111.5 L 362.5 116 L 356.5 117 L 348 109.5 L 334.5 94 L 334 112.5 L 330.5 116 L 324.5 117 L 320 113.5 L 319 110.5 L 319 49.5 L 323.5 44 L 326.5 43 Z M 334 58 L 334 74 Q 344 76 349 72 L 351 69 L 350 63 Q 346 56 334 58 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 384.5 43 L 392 48.5 L 402.5 65 L 405 63.5 L 414 48.5 L 418.5 44 Q 425.8 42.8 428 46.5 L 429 53.5 L 411 80.5 L 411 109.5 L 407.5 116 L 400.5 117 L 397 115 L 396 112.5 L 396 82.5 L 378 55.5 L 377 48.5 L 379.5 45 L 384.5 43 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 154.5 44 L 176.5 44 L 180.5 45 Q 189.7 47.8 195 54.5 Q 202.8 64.2 203 81.5 Q 200.3 83.3 202 89.5 L 199 98.5 L 188.5 111 L 176.5 116 L 154.5 116 L 149 111.5 L 149 48.5 L 152.5 45 L 154.5 44 Z M 163 59 L 164 101 L 176 101 L 180 99 L 185 94 L 188 84 Q 189 71 184 65 Q 181 60 176 59 L 163 59 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 267.5 135 L 291.5 135 L 313.5 140 Q 340.8 150.2 358 170.5 Q 372.1 186.4 379 209.5 L 382 224.5 L 382 250.5 L 379 265.5 L 371 285.5 Q 361.3 303.3 346.5 316 Q 331.7 329.2 310.5 336 L 292.5 340 L 267.5 340 L 248.5 336 L 240.5 333 L 226.5 326 L 221 321.5 L 220 315.5 L 223.5 311 L 229.5 310 L 253.5 322 L 266.5 325 L 281.5 326 L 282.5 325 L 292.5 325 L 311.5 320 Q 333.2 311.2 347 294.5 Q 356.3 283.8 362 269.5 L 367 251.5 L 368 233.5 L 367 232.5 L 366 218.5 L 362 205.5 Q 353.2 183.8 336.5 170 Q 324.7 159.8 308.5 154 L 292.5 150 L 280.5 150 L 279.5 149 L 278.5 150 L 261.5 151 L 245.5 156 Q 226.7 164.2 214 178.5 Q 200.2 193.2 194 215.5 L 192 225.5 L 192 249.5 L 198 271.5 L 209 290.5 L 209 295.5 L 206.5 299 L 199.5 300 L 195 296.5 Q 185 283 180 264.5 L 177 249.5 L 177 226.5 L 180 210.5 L 190 186.5 Q 198.4 171.9 210.5 161 Q 223.2 149.2 240.5 142 L 267.5 135 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 226.5 213 L 330.5 213 L 334 216.5 L 335 222.5 L 333 226 L 330.5 227 L 226.5 227 L 223 224.5 L 222 217.5 L 224.5 214 L 226.5 213 Z " /><path fill="rgb(2,2,3)" stroke="rgb(2,2,3)" stroke-width="1" opacity="0.996078431372549" d="M 225.5 252 L 330.5 252 L 333 253 L 335 256.5 L 335 260.5 L 330.5 266 L 226.5 266 L 223 263.5 L 222 256.5 L 225.5 252 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="M 0 0 L 76 0.5 Q 62.1 3.1 55 12.5 Q 49.7 18.2 48 27.5 L 48 64.5 L 51.5 69 L 55 70.5 L 55 90.5 L 53.5 91 L 49 94.5 L 48 96.5 L 48 437.5 Q 51.4 452.6 61.5 461 Q 69 467.5 80.5 470 L 331 470 L 331 503.5 L 336.5 511 L 339 511.5 L 0 512 L 0 0 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="M 450.5 0 L 511.5 0 L 512 0.5 L 512 512 L 395 511.5 L 401 507.5 L 403 501.5 L 403 470 L 440.5 470 L 446 465.5 L 447 456.5 L 437 442.5 L 435 435.5 L 435 426.5 Q 437.6 412.6 447.5 406 L 451.5 406 L 460 400.5 L 464 392.5 L 464 307.5 L 459.5 303 L 457 303 L 457 282.5 L 459.5 282 L 463 279.5 L 464 277.5 L 464 13.5 Q 461.8 6.8 456.5 3 L 450.5 1 L 450.5 0 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="M 366.5 494 L 389 511.5 L 345.5 512 L 345.5 511 L 366.5 494 Z " /><path fill="rgb(157,198,250)" stroke="rgb(157,198,250)" stroke-width="1" opacity="0.996078431372549" d="M 55.5 70 L 56 90.5 L 55 90.5 L 55.5 70 Z " /><path fill="rgb(157,198,250)" stroke="rgb(157,198,250)" stroke-width="1" opacity="0.996078431372549" d="M 348.5 70 L 347.5 72 L 348.5 70 Z " /><path fill="rgb(157,198,250)" stroke="rgb(157,198,250)" stroke-width="1" opacity="0.996078431372549" d="M 360.5 81 L 358.5 84 L 360.5 81 Z " /><path fill="rgb(157,198,250)" stroke="rgb(157,198,250)" stroke-width="1" opacity="0.996078431372549" d="M 210.5 160 L 209.5 162 L 210.5 160 Z " /><path fill="rgb(157,198,250)" stroke="rgb(157,198,250)" stroke-width="1" opacity="0.996078431372549" d="M 203.5 167 L 202.5 169 L 203.5 167 Z " /><path fill="rgb(157,198,250)" stroke="rgb(157,198,250)" stroke-width="1" opacity="0.996078431372549" d="M 210.5 303 L 213.5 307 L 210.5 303 Z " /><path fill="rgb(157,198,251)" stroke="rgb(157,198,251)" stroke-width="1" opacity="1" d="M 81.5 15 L 113.5 15 L 114 15.5 L 114 345 L 63 345 L 63 321.5 L 83 302.5 Q 95.7 287.2 102 265.5 L 105 251.5 L 105 223.5 Q 97 179.5 67.5 157 L 63 153.5 L 63 95.5 L 60.5 92 L 56 91 L 56 70.5 L 58.5 70 L 63 65.5 L 63 31.5 Q 64.7 23.2 70.5 19 L 81.5 15 Z " /><path fill="rgb(157,198,251)" stroke="rgb(157,198,251)" stroke-width="1" opacity="1" d="M 130 15 L 402.5 15 L 403 15.5 L 403 63.5 L 402 63.5 L 393 48.5 L 387.5 43 Q 380.3 41.8 378 45.5 L 376 52.5 L 395 81.5 L 395 111.5 L 397 116 L 403 118.5 L 403 290.5 L 402 291.5 L 401 302.5 L 394 318.5 L 379.5 334 L 364.5 342 L 349.5 345 L 130 345 L 130 15 Z M 222 42 L 217 47 L 217 112 L 218 114 Q 221 117 229 116 L 233 111 L 233 49 L 232 46 Q 230 41 222 42 Z M 273 43 L 269 45 L 245 108 L 246 114 Q 248 119 257 117 L 261 113 L 264 105 L 265 103 L 289 103 L 292 114 L 297 117 L 305 116 L 307 113 L 307 106 L 285 48 Q 283 41 273 43 Z M 324 43 L 319 48 L 319 113 L 320 115 L 323 117 L 327 118 L 331 117 L 335 112 L 336 96 L 347 110 L 355 117 L 358 118 Q 364 118 366 114 L 365 105 L 351 89 L 359 84 L 366 73 Q 368 60 363 54 Q 358 46 348 43 L 324 43 Z M 153 44 L 148 50 L 148 111 L 153 116 L 180 116 L 189 112 Q 200 104 203 88 L 203 72 Q 201 61 195 54 Q 190 46 180 44 L 153 44 Z M 272 134 L 271 135 L 264 135 L 254 137 L 237 143 Q 222 150 211 160 Q 196 174 186 193 L 179 212 L 177 222 L 177 230 L 176 231 L 176 245 L 177 246 L 177 254 L 179 264 Q 184 283 195 298 L 200 301 Q 204 302 206 300 L 209 301 L 210 304 L 216 309 Q 215 311 218 310 L 221 314 L 220 315 L 221 323 L 229 328 L 244 335 L 258 339 L 271 340 L 272 341 L 289 341 L 310 337 Q 332 330 348 316 Q 360 305 369 291 L 380 265 L 383 248 L 383 228 L 380 211 Q 373 186 358 170 Q 343 152 321 142 L 297 135 L 272 134 Z " /><path fill="rgb(157,198,251)" stroke="rgb(157,198,251)" stroke-width="1" opacity="1" d="M 335 59 Q 346.5 56.8 350 63.5 L 350 68.5 L 345.5 73 L 335 73 L 335 59 Z " /><path fill="rgb(157,198,251)" stroke="rgb(157,198,251)" stroke-width="1" opacity="1" d="M 164 60 L 176.5 60 L 183 64.5 Q 188.6 71.4 187 85.5 Q 185.3 94.8 178.5 99 L 164 101 L 164 60 Z " /><path fill="rgb(157,198,251)" stroke="rgb(157,198,251)" stroke-width="1" opacity="1" d="M 276.5 72 L 282 87 L 270 86.5 L 276.5 72 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 223.5 170 L 222.5 172 L 223.5 170 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 65.5 177 L 67.5 180 L 65.5 177 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 213.5 180 L 212.5 182 L 213.5 180 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 89.5 236 L 90 239.5 L 89 239.5 L 89.5 236 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 222.5 263 L 224.5 266 L 222.5 263 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 67.5 295 L 66.5 297 L 67.5 295 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 218.5 310 L 219.5 312 L 218.5 310 Z " /><path fill="rgb(175,221,241)" stroke="rgb(175,221,241)" stroke-width="1" opacity="1" d="M 222.5 311 L 221.5 313 L 222.5 311 Z " /><path fill="rgb(177,227,249)" stroke="rgb(177,227,249)" stroke-width="1" opacity="1" d="M 65.5 297 L 63.5 300 L 65.5 297 Z " /><path fill="rgb(177,227,249)" stroke="rgb(177,227,249)" stroke-width="1" opacity="1" d="M 207.5 299 L 217.5 310 L 207.5 299 Z " /><path fill="rgb(177,228,249)" stroke="rgb(177,228,249)" stroke-width="1" opacity="1" d="M 272.5 150 L 287.5 150 L 309.5 155 Q 331.8 163.7 346 180.5 Q 358.1 193.9 364 213.5 L 367 228.5 L 367 246.5 L 364 261.5 L 356 280.5 Q 348 294 336.5 304 Q 323 316 303.5 322 L 287.5 325 L 272.5 325 Q 270.8 322.3 264.5 324 L 247.5 319 L 231.5 310 L 224.5 310 L 220.5 312 L 208 298.5 Q 211 296.5 210 290.5 Q 199.9 278.1 195 260.5 L 192 243.5 L 192 231.5 L 193 230.5 L 194 218.5 L 198 205.5 Q 206 186 220.5 173 Q 231.8 162.3 247.5 156 L 264.5 151 Q 270.8 152.8 272.5 150 Z M 227 212 L 225 213 L 221 218 L 222 225 L 227 228 L 331 228 L 333 227 L 336 221 L 334 214 L 330 212 L 227 212 Z M 227 251 L 225 252 L 221 257 L 222 264 L 227 267 L 330 267 L 332 266 L 336 260 L 334 254 L 331 251 L 227 251 Z " /><path fill="rgb(177,228,249)" stroke="rgb(177,228,249)" stroke-width="1" opacity="1" d="M 63.5 176 Q 77.1 187.9 84 206.5 L 89 225.5 L 89 249.5 Q 83.5 281.5 63.5 299 L 63.5 176 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 77.5 15 L 80 15.5 L 77.5 16 L 77.5 15 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 114.5 15 L 115 391 L 78.5 392 L 63 399 L 63 345 L 113.5 345 L 114 344.5 L 114.5 15 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 403 15 L 447.5 15 L 449 16.5 L 449 276.5 L 453.5 282 L 457 282.5 L 457 303 Q 452.1 302.9 450 306.5 L 449 308.5 L 449 389.5 L 447.5 391 L 130.5 391 L 130 390.5 L 130 345 L 353.5 345 Q 377.3 340.3 390 324.5 L 399 309.5 L 403 294.5 L 403 117 L 409 114.5 L 411 109.5 L 411 80.5 L 428 55.5 L 429 48.5 L 426.5 45 L 418.5 44 L 414 48.5 L 403.5 65 L 402 64.5 L 403 63.5 L 403 15 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 69.5 19 L 66.5 23 L 69.5 19 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 220.5 43 L 218.5 46 L 220.5 43 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 344.5 43 L 347 43.5 L 344.5 44 L 344.5 43 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 281.5 44 L 283.5 47 L 281.5 44 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 322.5 44 L 320.5 47 L 322.5 44 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 151.5 45 L 149.5 48 L 151.5 45 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 390.5 46 L 391.5 48 L 390.5 46 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 356.5 47 L 361.5 53 L 356.5 47 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 188.5 48 L 189.5 50 L 188.5 48 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 232.5 48 L 233 109.5 L 232 109.5 L 232.5 48 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 148.5 49 L 149 109.5 L 148 109.5 L 148.5 49 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 392.5 49 L 393.5 51 L 392.5 49 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 195.5 55 L 196.5 57 L 195.5 55 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 335.5 58 L 344 58.5 L 335 59 L 334.5 74 L 334 59.5 L 335.5 58 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 173.5 59 L 176 59.5 L 173.5 60 L 173.5 59 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 346.5 59 L 347.5 61 L 346.5 59 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 181.5 62 L 182.5 64 L 181.5 62 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 350.5 64 L 351 67.5 L 350 67.5 L 350.5 64 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 384.5 65 L 385.5 67 L 384.5 65 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 386.5 68 L 387.5 70 L 386.5 68 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 276.5 70 L 276 71.5 L 275.5 73 L 275 71.5 L 276.5 70 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 388.5 71 L 389.5 73 L 388.5 71 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 202.5 72 L 203 75.5 L 202 75.5 L 202.5 72 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 342.5 73 L 345 73.5 L 342.5 74 L 342.5 73 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 187.5 77 L 188 82.5 L 187 82.5 L 187.5 77 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 362.5 78 L 361.5 80 L 362.5 78 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 395.5 82 L 396 111.5 L 395 111.5 L 395.5 82 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 357.5 83 L 356.5 85 L 357.5 83 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 202.5 84 L 203 86.5 L 202 86.5 L 202.5 84 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 352.5 91 L 356.5 96 L 352.5 91 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 334.5 94 L 335 109.5 L 334 109.5 L 334.5 94 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 336.5 96 L 339.5 100 L 336.5 96 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 173.5 100 L 176 100.5 L 173.5 101 L 173.5 100 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 360.5 100 L 363.5 104 L 360.5 100 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 197.5 101 L 196.5 103 L 197.5 101 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 264.5 102 L 288 102.5 L 264.5 103 L 263.5 104 L 264.5 102 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 195.5 104 L 189.5 111 L 195.5 104 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 343.5 104 L 346.5 108 L 343.5 104 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 245.5 107 L 246 111.5 L 245 111.5 L 245.5 107 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 187.5 111 L 186.5 113 L 187.5 111 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 149.5 112 L 152.5 116 L 149.5 112 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 231.5 112 L 229.5 115 L 231.5 112 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 350.5 112 L 353.5 116 L 350.5 112 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 246.5 113 L 248.5 116 L 246.5 113 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 259.5 113 L 257.5 116 L 259.5 113 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 333.5 113 L 331.5 116 L 333.5 113 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 293.5 114 L 294.5 116 L 293.5 114 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 364.5 114 L 363.5 116 L 364.5 114 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 272.5 134 L 287 134.5 L 272.5 135 L 272.5 134 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 263.5 135 L 267 135.5 L 263.5 136 L 263.5 135 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 293.5 135 L 296 135.5 L 293.5 136 L 293.5 135 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 333.5 149 L 334.5 151 L 333.5 149 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 267.5 150 L 270 150.5 L 267.5 151 L 267.5 150 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 222.5 151 L 221.5 153 L 222.5 151 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 336.5 151 L 337.5 153 L 336.5 151 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 339.5 153 L 340.5 155 L 339.5 153 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 218.5 154 L 217.5 156 L 218.5 154 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 64.5 155 L 65.5 157 L 64.5 155 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 343.5 156 L 345.5 159 L 343.5 156 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 214.5 157 L 211.5 161 L 214.5 157 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 68.5 158 L 80.5 171 L 68.5 158 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 350.5 162 L 354.5 167 L 350.5 162 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 202.5 169 L 199.5 173 L 202.5 169 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 337.5 171 L 340.5 175 L 337.5 171 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 358.5 171 L 360.5 174 L 358.5 171 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 219.5 173 L 215.5 178 L 219.5 173 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 83.5 174 L 84.5 176 L 83.5 174 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 197.5 175 L 196.5 177 L 197.5 175 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 342.5 176 L 345.5 180 L 342.5 176 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 362.5 176 L 363.5 178 L 362.5 176 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 86.5 178 L 87.5 180 L 86.5 178 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 69.5 181 L 70.5 183 L 69.5 181 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 366.5 182 L 367.5 184 L 366.5 182 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 369.5 187 L 370.5 189 L 369.5 187 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 227.5 212 L 329 212.5 L 227.5 213 L 227.5 212 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 178.5 216 L 179 218.5 L 178 218.5 L 178.5 216 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 103.5 218 L 104 220.5 L 103 220.5 L 103.5 218 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 221.5 218 L 222 221.5 L 221 221.5 L 221.5 218 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 177.5 222 L 178 224.5 L 177 224.5 L 177.5 222 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 104.5 224 L 105 228.5 L 104 228.5 L 104.5 224 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 89.5 228 L 90 231.5 L 89 231.5 L 89.5 228 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 382.5 228 L 383 236.5 L 382 236.5 L 382.5 228 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 176.5 232 L 177 242.5 L 176 242.5 L 176.5 232 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 367.5 236 L 368 238.5 L 367 238.5 L 367.5 236 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 382.5 238 L 383 246.5 L 382 246.5 L 382.5 238 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 89.5 243 L 90 246.5 L 89 246.5 L 89.5 243 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 104.5 246 L 105 250.5 L 104 250.5 L 104.5 246 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 192.5 246 L 193 248.5 L 192 248.5 L 192.5 246 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 177.5 250 L 178 252.5 L 177 252.5 L 177.5 250 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 103.5 254 L 104 256.5 L 103 256.5 L 103.5 254 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 221.5 257 L 222 259.5 L 221 259.5 L 221.5 257 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 333.5 263 L 331.5 266 L 333.5 263 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 227.5 266 L 329 266.5 L 227.5 267 L 227.5 266 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 93.5 285 L 92.5 287 L 93.5 285 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 370.5 286 L 369.5 288 L 370.5 286 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 209.5 291 L 210 294.5 L 209 294.5 L 209.5 291 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 70.5 292 L 69.5 294 L 70.5 292 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 193.5 294 L 194.5 296 L 193.5 294 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 87.5 295 L 86.5 297 L 87.5 295 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 345.5 295 L 343.5 298 L 345.5 295 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 363.5 297 L 362.5 299 L 363.5 297 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 84.5 299 L 83.5 301 L 84.5 299 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 200.5 300 L 204 300.5 L 200.5 301 L 200.5 300 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 339.5 301 L 336.5 305 L 339.5 301 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 360.5 301 L 358.5 304 L 360.5 301 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 81.5 303 L 77.5 308 L 81.5 303 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 355.5 307 L 349.5 314 L 355.5 307 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 72.5 312 L 68.5 317 L 72.5 312 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 345.5 316 L 343.5 319 L 345.5 316 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 65.5 318 L 63.5 321 L 65.5 318 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 340.5 320 L 339.5 322 L 340.5 320 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 334.5 324 L 333.5 326 L 334.5 324 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 329.5 327 L 328.5 329 L 329.5 327 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 263.5 339 L 266 339.5 L 263.5 340 L 263.5 339 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 293.5 339 L 296 339.5 L 293.5 340 L 293.5 339 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 272.5 340 L 287 340.5 L 272.5 341 L 272.5 340 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 86.5 406 L 245 406.5 L 86.5 407 L 86.5 406 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 318.5 406 L 331 406.5 L 318 407 L 317.5 442 L 317 407.5 L 318.5 406 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 403.5 406 L 426.5 406 L 427 407.5 L 425.5 407 L 403.5 407 L 403.5 406 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 270.5 443 L 269.5 445 L 270.5 443 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 69.5 447 L 70.5 449 L 69.5 447 Z " /><path fill="rgb(126,176,244)" stroke="rgb(126,176,244)" stroke-width="1" opacity="0.996078431372549" d="M 297.5 447 L 298.5 449 L 297.5 447 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 163.5 59 L 164 82.5 L 163 82.5 L 163.5 59 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 270.5 87 L 283 87.5 L 270.5 88 L 270.5 87 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 229.5 227 L 328 227.5 L 229.5 228 L 229.5 227 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 367.5 233 L 368 235.5 L 367 235.5 L 367.5 233 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 367.5 239 L 368 241.5 L 367 241.5 L 367.5 239 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 229.5 251 L 328 251.5 L 229.5 252 L 229.5 251 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 76.5 308 L 73.5 312 L 76.5 308 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 278.5 325 L 282 325.5 L 278.5 326 L 278.5 325 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 261 406 L 288.5 406 L 289.5 407 L 302 407 L 301.5 431 L 289.5 421 Q 286.2 417.8 278.5 419 L 273.5 421 L 261 431 L 261 406 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 346 406 L 386.5 406 L 388 407.5 L 388 490.5 L 386.5 491 L 373.5 480 L 362.5 479 L 346 491 L 346 406 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 402.5 407 L 403 454.5 L 402 454.5 L 402.5 407 Z " /><path fill="rgb(232,173,102)" stroke="rgb(232,173,102)" stroke-width="1" opacity="1" d="M 248.5 448 L 249.5 450 L 248.5 448 Z " /><path fill="rgb(216,226,240)" stroke="rgb(216,226,240)" stroke-width="1" opacity="1" d="M 245.5 407 L 246 445.5 L 250.5 451 L 257.5 453 L 262.5 451 L 273.5 441 L 273.5 443 L 291.5 443 L 302.5 452 L 307.5 453 L 311.5 452 L 317 446.5 L 318.5 443 L 331 443 L 331 455 L 83.5 455 Q 72.4 452.6 67 444.5 L 66 442.5 L 67.5 443 L 244.5 443 L 245 442.5 L 245.5 407 Z " /><path fill="rgb(216,226,240)" stroke="rgb(216,226,240)" stroke-width="1" opacity="1" d="M 410.5 407 L 426 407.5 L 420 422.5 L 420 438.5 Q 421.8 448.4 426 455 L 403 455 L 403 419.5 Q 405.3 411.8 410.5 407 Z " /><path fill="rgb(216,226,240)" stroke="rgb(216,226,240)" stroke-width="1" opacity="1" d="M 280.5 435 L 279.5 437 L 280.5 435 Z " /><path fill="rgb(216,226,240)" stroke="rgb(216,226,240)" stroke-width="1" opacity="1" d="M 287.5 439 L 288.5 441 L 287.5 439 Z " /><path fill="rgb(231,236,246)" stroke="rgb(231,236,246)" stroke-width="1" opacity="1" d="M 82.5 407 L 244.5 407 L 245 407.5 L 245 443 L 67.5 443 L 65 440.5 L 63 433.5 L 63 428.5 Q 65 416.5 73.5 411 L 82.5 407 Z " /><path fill="rgb(231,236,246)" stroke="rgb(231,236,246)" stroke-width="1" opacity="1" d="M 318 407 L 331 407 L 331 443 L 318 443 L 318 407 Z " /><path fill="rgb(231,236,246)" stroke="rgb(231,236,246)" stroke-width="1" opacity="1" d="M 403 407 L 410 407.5 Q 405.3 411.8 403.5 419 L 403 407 Z " /><path fill="rgb(231,236,246)" stroke="rgb(231,236,246)" stroke-width="1" opacity="1" d="M 281.5 435 L 291 442.5 L 273.5 443 L 278.5 437 L 281.5 435 Z " />`;

function DiaryBookIcon({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
      dangerouslySetInnerHTML={{ __html: DIARY_BOOK_ICON_MARKUP }}
    />
  );
}
