"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CircleAlert } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData } from "@/lib/api/http-client";

const STORY_WRITE_CATEGORIES = ["고민", "일상", "질문"] as const;

type StoryWriteCategory = (typeof STORY_WRITE_CATEGORIES)[number];
type BackendPostCategory = "DAILY" | "WORRY" | "QUESTION";

const STORY_WRITE_CATEGORY_TO_API_CATEGORY: Record<StoryWriteCategory, BackendPostCategory> = {
  고민: "WORRY",
  일상: "DAILY",
  질문: "QUESTION",
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "고민을 나누지 못했습니다.";
}

export default function WriteStoryPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<StoryWriteCategory>("고민");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasDraft = title.trim().length > 0 || content.trim().length > 0;
  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      setSubmitError("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await requestData<number>("/api/v1/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          thumbnail: null,
          category: STORY_WRITE_CATEGORY_TO_API_CATEGORY[selectedCategory],
        }),
      });

      router.push("/stories");
    } catch (error: unknown) {
      setSubmitError(resolveErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (!hasDraft || window.confirm("작성 중인 고민 내용을 닫을까요?")) {
      router.push("/stories");
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

          <section className="mx-auto mt-8 w-full max-w-4xl text-center">
            <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-[#1f3150] sm:text-[38px]">
              고민 나누기
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[#7a8da9] sm:text-[17px]">
              당신의 마음속 깊은 이야기를 들려주세요. 우리가 함께 할게요.
            </p>
          </section>

          <section className="mx-auto mt-8 w-full max-w-4xl">
            <div className="home-panel rounded-[34px] px-6 py-7 sm:px-8 sm:py-8">
              <div>
                <p className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]">카테고리 선택</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {STORY_WRITE_CATEGORIES.map((category) => {
                    const active = category === selectedCategory;

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className={`min-w-[64px] rounded-full px-5 py-3 text-[15px] font-semibold transition ${
                          active
                            ? "bg-[#4f8cf0] text-white shadow-[0_16px_28px_-20px_rgba(58,107,183,0.8)]"
                            : "bg-[#f4f8ff] text-[#6f84a5] hover:bg-[#e9f1ff]"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8">
                <label
                  htmlFor="story-title"
                  className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                >
                  제목
                </label>
                <input
                  id="story-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="고민을 한 줄로 요약해 주세요"
                  className="mt-3 h-[64px] w-full rounded-[18px] border border-[#dce6f5] bg-[#fcfdff] px-5 text-[17px] text-[#2b4162] outline-none transition placeholder:text-[#a0b3ce] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                />
              </div>

              <div className="mt-8">
                <label
                  htmlFor="story-content"
                  className="text-[17px] font-semibold tracking-[-0.03em] text-[#2c4162]"
                >
                  내용
                </label>
                <textarea
                  id="story-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="이곳에 당신의 이야기를 마음껏 적어주세요. 따뜻한 조언들이 기다리고 있어요."
                  className="mt-3 h-[280px] w-full resize-y rounded-[22px] border border-[#dce6f5] bg-[#fcfdff] px-5 py-4 text-[16px] leading-8 text-[#2b4162] outline-none transition placeholder:text-[#a0b3ce] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20 sm:h-[320px]"
                />
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-[#7d8fa8]">
                <CircleAlert size={16} className="shrink-0" />
                <p>작성하신 고민은 익명으로 안전하게 보호됩니다.</p>
              </div>

              {submitError ? (
                <div className="mt-4 rounded-[18px] border border-[#ffd7d7] bg-[#fff5f5] px-4 py-3 text-sm text-[#c24a4a]">
                  {submitError}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex h-[58px] flex-1 items-center justify-center rounded-[18px] bg-[#edf2f9] text-[18px] font-semibold text-[#6b7f9c] transition hover:bg-[#e3ebf6]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className={`inline-flex h-[58px] flex-[1.8] items-center justify-center rounded-[18px] text-[18px] font-semibold text-white transition ${
                    canSubmit
                      ? "bg-[#4f8cf0] shadow-[0_18px_34px_-24px_rgba(58,107,183,0.82)] hover:bg-[#3f80eb]"
                      : "cursor-not-allowed bg-[#b6c9e7]"
                  }`}
                >
                  {isSubmitting ? "나누는 중..." : "나누기 완료"}
                </button>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-8 w-full max-w-4xl">
            <div className="rounded-[30px] border border-[#dce7fb] bg-[#eaf3ff] px-6 py-8 text-center shadow-[0_24px_48px_-36px_rgba(73,107,167,0.38)]">
              <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#4f8cf0]">
                말하기 어려운 고민이 있다면?
              </p>
              <p className="mt-3 text-[15px] leading-7 text-[#6f84a5]">
                누구에게도 털어놓지 못했던 이야기를 익명 편지로 보내보세요.
              </p>
              <Link
                href="/letters/write"
                className="mt-4 inline-flex items-center gap-2 text-[17px] font-semibold text-[#4f8cf0] underline decoration-[#a9c5f5] underline-offset-4 transition hover:text-[#397ae6]"
              >
                익명 편지 쓰러가기
                <ArrowRight size={18} />
              </Link>
            </div>
          </section>
      </div>
    </div>
  );
}
