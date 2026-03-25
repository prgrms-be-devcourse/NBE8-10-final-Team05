"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BookOpenText,
  CalendarDays,
  Globe,
  ImagePlus,
  Lock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData, requestVoid } from "@/lib/api/http-client";
import { toErrorMessage } from "@/lib/api/rs-data";
import { useAuthStore } from "@/lib/auth/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const PAGE_SIZE = 9;

const DIARY_CATEGORIES = [
  "연애",
  "친구",
  "진로",
  "가족",
  "직장",
  "일상",
  "기타",
] as const;

type DiaryCategory = (typeof DIARY_CATEGORIES)[number];

type DiaryItem = {
  id: number;
  title: string;
  content: string;
  categoryName: string;
  nickname: string;
  imageUrl: string | null;
  isPrivate: boolean;
  createDate: string;
  modifyDate: string;
};

type PageResponse<T> = {
  content: T[];
  number: number;
  totalPages: number;
  totalElements: number;
  size: number;
  first: boolean;
  last: boolean;
};

function formatDate(dateTime: string): string {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function resolveImageSrc(imageUrl: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
}

export default function DashboardPage() {
  const { member } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);

  const [editingDiaryId, setEditingDiaryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryName, setCategoryName] = useState<DiaryCategory>("일상");
  const [isPrivate, setIsPrivate] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const isEditMode = editingDiaryId !== null;

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [],
  );

  useEffect(() => {
    void fetchMyDiaries(0);
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  async function fetchMyDiaries(nextPage: number): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const pageData = await requestData<PageResponse<DiaryItem>>(
        `/api/v1/diaries?page=${nextPage}&size=${PAGE_SIZE}`,
      );

      setDiaries(pageData.content ?? []);
      setPage(pageData.number ?? nextPage);
      setTotalPages(Math.max(pageData.totalPages ?? 1, 1));
      setTotalElements(pageData.totalElements ?? 0);
    } catch (error: unknown) {
      setErrorMessage(toErrorMessage(error));
      setDiaries([]);
      setPage(0);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm(): void {
    setEditingDiaryId(null);
    setTitle("");
    setContent("");
    setCategoryName("일상");
    setIsPrivate(true);
    setImageFile(null);

    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setFileInputKey((prev) => prev + 1);
  }

  function startEdit(diary: DiaryItem): void {
    setEditingDiaryId(diary.id);
    setTitle(diary.title);
    setContent(diary.content);
    setCategoryName((DIARY_CATEGORIES.includes(diary.categoryName as DiaryCategory)
      ? diary.categoryName
      : "기타") as DiaryCategory);
    setIsPrivate(diary.isPrivate);
    setImageFile(null);

    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(resolveImageSrc(diary.imageUrl));

    setErrorMessage(null);
    setNoticeMessage("수정 모드로 전환되었습니다.");
    setFileInputKey((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);

    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (!file) {
      setImagePreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(nextPreviewUrl);
  }

  function buildFormData(): FormData {
    const formData = new FormData();

    const payload = {
      title: title.trim(),
      content: content.trim(),
      categoryName,
      isPrivate,
    };

    formData.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    if (imageFile) {
      formData.append("image", imageFile);
    }

    return formData;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setErrorMessage("제목과 내용을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const formData = buildFormData();

      if (isEditMode && editingDiaryId !== null) {
        await requestVoid(`/api/v1/diaries/${editingDiaryId}`, {
          method: "PUT",
          body: formData,
        });

        setNoticeMessage("일기를 수정했습니다.");
      } else {
        await requestData<number>("/api/v1/diaries", {
          method: "POST",
          body: formData,
        });

        setNoticeMessage("새 일기를 작성했습니다.");
      }

      resetForm();
      await fetchMyDiaries(0);
    } catch (error: unknown) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(diaryId: number): Promise<void> {
    if (!window.confirm("이 일기를 삭제할까요?")) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await requestVoid(`/api/v1/diaries/${diaryId}`, {
        method: "DELETE",
      });

      if (editingDiaryId === diaryId) {
        resetForm();
      }

      setNoticeMessage("일기를 삭제했습니다.");
      await fetchMyDiaries(0);
    } catch (error: unknown) {
      setErrorMessage(toErrorMessage(error));
    }
  }

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        <section className="home-hero mt-8 rounded-[36px] px-6 py-9 text-white sm:px-10">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-white/78">private diary</p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] sm:text-[34px]">나의 일기</h1>
          <p className="mt-2 text-sm leading-6 text-white/88 sm:text-base">
            오늘의 감정과 생각을 차분하게 기록하세요. 기본 설정은 비공개이며, 본인 계정에서만 확인됩니다.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/85 sm:text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
              <CalendarDays size={14} />
              {todayLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
              <BookOpenText size={14} />
              총 {totalElements}개 기록
            </span>
            {member ? <span className="rounded-full bg-white/20 px-3 py-1">{member.nickname}</span> : null}
          </div>
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="home-panel rounded-[34px] px-6 py-6 sm:px-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-[#233552]">내 일기 목록</h2>
              <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#6c82a7]">
                페이지 {page + 1} / {totalPages}
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-[20px] border border-[#e3ecfb] bg-[#fbfdff] px-4 py-10 text-center text-sm text-[#7a8eaf]">
                일기 목록을 불러오는 중입니다...
              </div>
            ) : diaries.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-[#cdddf7] bg-[#fbfdff] px-4 py-10 text-center text-sm text-[#7a8eaf]">
                아직 작성한 일기가 없습니다. 오른쪽에서 첫 일기를 작성해 보세요.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {diaries.map((diary) => {
                  const thumbnail = resolveImageSrc(diary.imageUrl);

                  return (
                    <article
                      key={diary.id}
                      className="home-card flex h-full flex-col rounded-[24px] px-4 py-4 text-[#324763]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[11px] font-semibold text-[#6b81a7]">
                          {diary.categoryName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#8fa0b8]">
                          {diary.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                          {diary.isPrivate ? "비공개" : "공개"}
                        </span>
                      </div>

                      <h3 className="mt-3 line-clamp-1 text-[17px] font-semibold tracking-[-0.02em] text-[#2b4162]">
                        {diary.title}
                      </h3>

                      {thumbnail ? (
                        <div className="relative mt-3 h-28 w-full overflow-hidden rounded-[14px] border border-[#dbe7fb]">
                          <Image
                            src={thumbnail}
                            alt="일기 썸네일"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mt-3 flex h-28 w-full items-center justify-center rounded-[14px] border border-dashed border-[#dbe7fb] bg-[#f8fbff] text-[#9ab0cc]">
                          <ImagePlus size={18} />
                        </div>
                      )}

                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#7b8da9]">{diary.content}</p>

                      <div className="mt-auto border-t border-[#e8f0fd] pt-3">
                        <p className="text-[11px] text-[#8fa0b8]">작성일 {formatDate(diary.createDate)}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(diary)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-[#d8e6fb] bg-white px-3 py-1.5 text-xs font-semibold text-[#506582] transition hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                          >
                            <Pencil size={13} /> 수정
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(diary.id)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-[#f1c3c3] bg-white px-3 py-1.5 text-xs font-semibold text-[#a95858] transition hover:border-[#eaa4a4] hover:text-[#8e3a3a]"
                          >
                            <Trash2 size={13} /> 삭제
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isLoading || page <= 0}
                onClick={() => void fetchMyDiaries(page - 1)}
                className="rounded-full border border-[#d8e6fb] bg-white px-4 py-2 text-sm font-medium text-[#506582] disabled:cursor-not-allowed disabled:opacity-50"
              >
                이전
              </button>
              <button
                type="button"
                disabled={isLoading || page + 1 >= totalPages}
                onClick={() => void fetchMyDiaries(page + 1)}
                className="rounded-full border border-[#d8e6fb] bg-white px-4 py-2 text-sm font-medium text-[#506582] disabled:cursor-not-allowed disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="home-panel rounded-[28px] px-5 py-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#233552]">
                  {isEditMode ? "일기 수정" : "새 일기 작성"}
                </h2>
                {isEditMode ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-1 rounded-full border border-[#d8e6fb] bg-white px-3 py-1 text-xs font-semibold text-[#506582]"
                  >
                    <X size={13} /> 취소
                  </button>
                ) : null}
              </div>

              <form className="mt-4 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                <label className="block">
                  <span className="text-xs font-semibold tracking-[0.08em] text-[#89a0c2] uppercase">제목</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="오늘의 마음을 한 줄로 적어보세요"
                    className="mt-2 w-full rounded-[14px] border border-[#d8e6fb] bg-[#fbfdff] px-3 py-2 text-sm text-[#2b4162] outline-none transition focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    maxLength={100}
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold tracking-[0.08em] text-[#89a0c2] uppercase">카테고리</span>
                  <select
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value as DiaryCategory)}
                    className="mt-2 w-full rounded-[14px] border border-[#d8e6fb] bg-[#fbfdff] px-3 py-2 text-sm text-[#2b4162] outline-none transition focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                  >
                    {DIARY_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold tracking-[0.08em] text-[#89a0c2] uppercase">내용</span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="오늘 있었던 일과 감정을 자유롭게 기록해 보세요."
                    className="mt-2 h-40 w-full resize-y rounded-[16px] border border-[#d8e6fb] bg-[#fbfdff] px-3 py-3 text-sm leading-6 text-[#2b4162] outline-none transition focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold tracking-[0.08em] text-[#89a0c2] uppercase">이미지</span>
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-2 block w-full rounded-[14px] border border-[#d8e6fb] bg-[#fbfdff] px-3 py-2 text-sm text-[#506582] file:mr-3 file:rounded-full file:border-0 file:bg-[#dce9ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#5279b7]"
                  />
                </label>

                {imagePreviewUrl ? (
                  <div className="relative h-40 w-full overflow-hidden rounded-[16px] border border-[#dbe7fb]">
                    <Image
                      src={imagePreviewUrl}
                      alt="선택한 이미지 미리보기"
                      fill
                      sizes="(max-width: 1024px) 100vw, 360px"
                      className="object-cover"
                      unoptimized={imagePreviewUrl.startsWith("blob:")}
                    />
                  </div>
                ) : null}

                <label className="flex items-center justify-between rounded-[14px] border border-[#d8e6fb] bg-[#fbfdff] px-3 py-2">
                  <span className="text-sm font-medium text-[#4f6381]">비공개 설정</span>
                  <button
                    type="button"
                    onClick={() => setIsPrivate((prev) => !prev)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      isPrivate ? "bg-[#dce9ff] text-[#4f70a6]" : "bg-[#f2f4f8] text-[#6d7381]"
                    }`}
                  >
                    {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                    {isPrivate ? "비공개" : "공개"}
                  </button>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-[#5f95f3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a82e5] disabled:cursor-not-allowed disabled:bg-[#b7c9e7]"
                >
                  {isSubmitting ? "저장 중..." : isEditMode ? "일기 수정하기" : "일기 작성하기"}
                </button>
              </form>
            </section>

            {noticeMessage ? (
              <section className="home-panel rounded-[22px] border border-[#cfe0fa] bg-[#f6faff] px-4 py-3 text-sm text-[#4d6791]">
                {noticeMessage}
              </section>
            ) : null}

            {errorMessage ? (
              <section className="home-panel rounded-[22px] border border-[#f3d0d0] bg-[#fff8f8] px-4 py-3 text-sm text-[#9a4b4b]">
                {errorMessage}
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </div>
  );
}
