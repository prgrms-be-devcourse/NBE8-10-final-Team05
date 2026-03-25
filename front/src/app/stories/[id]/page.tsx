"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Clock3, Eye, UserRound } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";
import { toErrorMessage } from "@/lib/api/rs-data";

type PostCategory = "DAILY" | "WORRY" | "QUESTION";

type StoryDetail = {
  id: number;
  title: string;
  content: string;
  viewCount: number;
  createDate: string;
  modifyDate: string;
  thumbnail: string | null;
  category: PostCategory;
  authorid: number;
  nickname: string;
};

const CATEGORY_LABEL: Record<PostCategory, string> = {
  DAILY: "일상",
  WORRY: "고민",
  QUESTION: "질문",
};

function parseStoryId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function StoryDetailPage() {
  const params = useParams();
  const storyId = useMemo(() => parseStoryId(params.id), [params.id]);

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStoryDetail(postId: number): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await requestData<StoryDetail>(`/api/v1/posts/${postId}`);
        if (!cancelled) {
          setStory(data);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setStory(null);
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (storyId === null) {
      setStory(null);
      setErrorMessage("잘못된 고민 상세 경로입니다.");
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void fetchStoryDetail(storyId);

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="mx-auto mt-8 w-full max-w-5xl">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#4f70a6] underline decoration-[#9eb5d4] underline-offset-4 transition hover:text-[#35527e]"
          >
            <ChevronLeft size={16} />
            고민 공유 목록
          </Link>

          {isLoading ? (
            <div className="home-panel mt-4 rounded-[28px] px-6 py-14 text-center text-[#5f7598]">
              고민 내용을 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="home-panel mt-4 rounded-[28px] border border-[#f3d0d0] bg-[#fff8f8] px-6 py-12 text-center">
              <p className="text-[18px] font-semibold text-[#7a3d3d]">고민을 불러오지 못했습니다.</p>
              <p className="mt-2 text-sm text-[#9a4b4b]">{errorMessage}</p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && story ? (
            <article className="home-panel mt-4 rounded-[32px] px-6 py-7 sm:px-8 sm:py-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5b749a]">
                <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-[#486ca1]">
                  {CATEGORY_LABEL[story.category] ?? story.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f7fbff] px-3 py-1">
                  <Clock3 size={13} />
                  {formatDate(story.createDate)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f7fbff] px-3 py-1">
                  <Eye size={13} />
                  조회 {story.viewCount}
                </span>
              </div>

              <h1 className="mt-6 text-[30px] font-semibold leading-[1.35] tracking-[-0.03em] text-[#223552] sm:text-[34px]">
                {story.title}
              </h1>

              <div className="mt-8 rounded-[24px] border border-[#dce6f5] bg-[#fcfdff] px-5 py-6">
                <p className="whitespace-pre-wrap text-[16px] leading-8 text-[#415a7d]">{story.content}</p>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f0fd] pt-5 text-sm text-[#6f84a5]">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={15} />
                  {story.nickname}
                </span>
                <span>수정일 {formatDate(story.modifyDate)}</span>
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </div>
  );
}
