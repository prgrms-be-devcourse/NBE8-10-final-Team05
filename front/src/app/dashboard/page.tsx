"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Lock,
  Trash2,
  X,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData, requestVoid } from "@/lib/api/http-client";
import { ApiError, toErrorMessage } from "@/lib/api/rs-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const CALENDAR_PAGE_SIZE = 30;
const TODAY_LOOKUP_PAGE_SIZE = 10;

const DIARY_CATEGORIES = [
  "연애",
  "친구",
  "진로",
  "가족",
  "직장",
  "일상",
  "기타",
] as const;
const MONTH_PICKER_LABELS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
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

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKeyFromDateTime(dateTime: string): string {
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return toDateKey(parsed);
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toMonthKeyFromDateKey(dateKey: string): string | null {
  const [yearRaw, monthRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonth(baseMonth: Date, amount: number): Date {
  return new Date(baseMonth.getFullYear(), baseMonth.getMonth() + amount, 1);
}

function formatMonthLabel(month: Date): string {
  return `${month.getFullYear()}년 ${month.getMonth() + 1}월`;
}

function formatDateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }

  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function buildCurrentMonthDays(month: Date): Array<{ date: Date; dateKey: string }> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const current = new Date(year, monthIndex, index + 1);
    return {
      date: current,
      dateKey: toDateKey(current),
    };
  });
}

function isBeforeTargetMonth(date: Date, targetYear: number, targetMonth: number): boolean {
  if (date.getFullYear() < targetYear) {
    return true;
  }

  if (date.getFullYear() > targetYear) {
    return false;
  }

  return date.getMonth() < targetMonth;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [totalElements, setTotalElements] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [isDiaryDetailOpen, setIsDiaryDetailOpen] = useState(false);
  const [monthDiaries, setMonthDiaries] = useState<DiaryItem[]>([]);
  const monthDiaryCacheRef = useRef<Map<string, DiaryItem[]>>(new Map());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());

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
  const todayDateKey = useMemo(() => toDateKey(new Date()), []);
  const todayMonthKey = useMemo(() => toMonthKey(new Date()), []);
  const isCurrentMonthSelected = useMemo(
    () => toMonthKey(calendarMonth) === todayMonthKey,
    [calendarMonth, todayMonthKey],
  );

  const weekDays = useMemo(() => ["일", "월", "화", "수", "목", "금", "토"], []);
  const monthStartWeekDay = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay(),
    [calendarMonth],
  );
  const calendarDays = useMemo(() => buildCurrentMonthDays(calendarMonth), [calendarMonth]);
  const diaryCountByDate = useMemo(() => {
    const counter = new Map<string, number>();

    monthDiaries.forEach((diary) => {
      const key = toDateKeyFromDateTime(diary.createDate);
      if (!key) {
        return;
      }

      counter.set(key, (counter.get(key) ?? 0) + 1);
    });

    return counter;
  }, [monthDiaries]);
  const selectedDateDiaries = useMemo(() => {
    return monthDiaries.filter((diary) => toDateKeyFromDateTime(diary.createDate) === selectedDateKey);
  }, [monthDiaries, selectedDateKey]);
  const selectedDiary = selectedDateDiaries[0] ?? null;

  useEffect(() => {
    if (toMonthKeyFromDateKey(selectedDateKey) !== toMonthKey(calendarMonth)) {
      const today = new Date();
      const fallbackDate =
        today.getFullYear() === calendarMonth.getFullYear() &&
        today.getMonth() === calendarMonth.getMonth()
          ? today
          : calendarMonth;
      setSelectedDateKey(toDateKey(fallbackDate));
    }
  }, [calendarMonth, selectedDateKey]);

  useEffect(() => {
    if (selectedDateKey > todayDateKey) {
      setSelectedDateKey(todayDateKey);
    }
  }, [selectedDateKey, todayDateKey]);

  useEffect(() => {
    if (!selectedDiary) {
      setIsDiaryDetailOpen(false);
    }
  }, [selectedDiary]);

  useEffect(() => {
    if (!isMonthPickerOpen) {
      return;
    }

    setMonthPickerYear(calendarMonth.getFullYear());
  }, [isMonthPickerOpen, calendarMonth]);

  useEffect(() => {
    if (!isMonthPickerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsMonthPickerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMonthPickerOpen]);

  useEffect(() => {
    void loadMonthDiaries(calendarMonth);
  }, [calendarMonth]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  async function loadMonthDiaries(targetMonth: Date, options: { force?: boolean } = {}): Promise<void> {
    const normalizedMonth = startOfMonth(targetMonth);
    const monthKey = toMonthKey(normalizedMonth);

    if (!options.force) {
      const cached = monthDiaryCacheRef.current.get(monthKey);
      if (cached) {
        setMonthDiaries(cached);
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);
    setMonthDiaries([]);

    try {
      const targetYear = normalizedMonth.getFullYear();
      const targetMonthIndex = normalizedMonth.getMonth();

      let page = 0;
      let totalPages = 1;
      let totalCount = 0;
      const matchedDiaries: DiaryItem[] = [];

      while (page < totalPages) {
        const pageData = await requestData<PageResponse<DiaryItem>>(
          `/api/v1/diaries?page=${page}&size=${CALENDAR_PAGE_SIZE}`,
        );

        if (page === 0) {
          totalPages = Math.max(pageData.totalPages ?? 1, 1);
          totalCount = pageData.totalElements ?? 0;
        }

        const content = pageData.content ?? [];
        if (content.length === 0) {
          break;
        }

        content.forEach((diary) => {
          const createdAt = new Date(diary.createDate);
          if (Number.isNaN(createdAt.getTime())) {
            return;
          }

          if (createdAt.getFullYear() === targetYear && createdAt.getMonth() === targetMonthIndex) {
            matchedDiaries.push(diary);
          }
        });

        const oldestDate = new Date(content[content.length - 1].createDate);
        if (
          !Number.isNaN(oldestDate.getTime()) &&
          isBeforeTargetMonth(oldestDate, targetYear, targetMonthIndex)
        ) {
          break;
        }

        page += 1;
      }

      matchedDiaries.sort(
        (a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime(),
      );

      monthDiaryCacheRef.current.set(monthKey, matchedDiaries);
      setMonthDiaries(matchedDiaries);
      setTotalElements(totalCount);
    } catch (error: unknown) {
      setErrorMessage(toErrorMessage(error));
      setMonthDiaries([]);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  }

  const resetForm = useCallback((): void => {
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
  }, [imagePreviewUrl]);

  const applyDiaryToForm = useCallback((diary: DiaryItem): void => {
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
    setFileInputKey((prev) => prev + 1);
  }, [imagePreviewUrl]);

  function startEdit(diary: DiaryItem): void {
    applyDiaryToForm(diary);
    setNoticeMessage("수정 모드로 전환되었습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const targetDiary = selectedDateDiaries[0];
    if (targetDiary) {
      if (editingDiaryId !== targetDiary.id) {
        applyDiaryToForm(targetDiary);
        setNoticeMessage("선택한 날짜 기록으로 수정 모드 전환되었습니다.");
      }
      return;
    }

    if (editingDiaryId !== null) {
      resetForm();
      setNoticeMessage("새 일기 작성 모드로 전환되었습니다.");
    }
  }, [isLoading, selectedDateDiaries, editingDiaryId, applyDiaryToForm, resetForm]);

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

  async function findTodayDiary(): Promise<DiaryItem | null> {
    const pageData = await requestData<PageResponse<DiaryItem>>(
      `/api/v1/diaries?page=0&size=${TODAY_LOOKUP_PAGE_SIZE}`,
    );

    const todayKey = toDateKey(new Date());
    return (
      (pageData.content ?? []).find(
        (diary) => toDateKeyFromDateTime(diary.createDate) === todayKey,
      ) ?? null
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!isEditMode) {
      try {
        const todayDiary = await findTodayDiary();
        if (todayDiary) {
          const today = new Date();
          const todayMonth = startOfMonth(today);
          setCalendarMonth(todayMonth);
          setSelectedDateKey(toDateKey(today));
          startEdit(todayDiary);
          setNoticeMessage("오늘 기록이 있어 수정 모드로 전환했습니다.");
          return;
        }
      } catch {
        // 조회 실패 시에는 기본 저장 흐름을 그대로 진행하고, 서버 응답에 따라 처리한다.
      }
    }

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
      monthDiaryCacheRef.current.clear();

      const targetMonth = isEditMode && editingDiaryId !== null ? calendarMonth : startOfMonth(new Date());
      const nextSelectedDateKey =
        isEditMode && editingDiaryId !== null ? selectedDateKey : toDateKey(new Date());
      setCalendarMonth(targetMonth);
      setSelectedDateKey(nextSelectedDateKey);
      await loadMonthDiaries(targetMonth, { force: true });
    } catch (error: unknown) {
      if (!isEditMode && error instanceof ApiError && error.resultCode === "409-1") {
        try {
          const todayDiary = await findTodayDiary();
          if (todayDiary) {
            const today = new Date();
            const todayMonth = startOfMonth(today);
            setCalendarMonth(todayMonth);
            setSelectedDateKey(toDateKey(today));
            startEdit(todayDiary);
            setNoticeMessage("오늘 기록이 있어 수정 모드로 전환했습니다.");
            return;
          }
        } catch {
          // fallback 조회까지 실패하면 기존 에러 메시지 처리
        }
      }
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(diaryId: number): Promise<void> {
    if (!window.confirm("이 날의 마음 기록을 조용히 놓아보낼까요?\n삭제하면 다시 되돌릴 수 없어요.")) {
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
      monthDiaryCacheRef.current.clear();
      await loadMonthDiaries(calendarMonth, { force: true });
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
          </div>
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="home-panel rounded-[34px] border-0 shadow-none px-6 py-6 sm:px-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-[#233552]">내 일기 캘린더</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDiaryDetailOpen(false);
                    setCalendarMonth((prev) => addMonth(prev, -1));
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-[#d8e6fb] bg-white p-2 text-[#506582] transition hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                  aria-label="이전 달"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setIsDiaryDetailOpen(false);
                    setCalendarMonth(startOfMonth(now));
                    setSelectedDateKey(toDateKey(now));
                  }}
                  className="rounded-full border border-[#d8e6fb] bg-white px-3 py-1 text-xs font-semibold text-[#506582] transition hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDiaryDetailOpen(false);
                    setCalendarMonth((prev) => {
                      const nextMonth = addMonth(prev, 1);
                      return toMonthKey(nextMonth) > todayMonthKey ? prev : nextMonth;
                    });
                  }}
                  disabled={isCurrentMonthSelected}
                  className={`inline-flex items-center justify-center rounded-full border p-2 transition ${
                    isCurrentMonthSelected
                      ? "cursor-not-allowed border-[#e5edf9] bg-[#f5f8fe] text-[#bcc8db]"
                      : "border-[#d8e6fb] bg-white text-[#506582] hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                  }`}
                  aria-label="다음 달"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {isDiaryDetailOpen && selectedDiary ? (
              <div className="rounded-[22px] bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={() => setIsDiaryDetailOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#506582] transition hover:text-[#2f4b73]"
                >
                  <ChevronLeft size={14} />
                  돌아가기
                </button>

                <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-[#2b4162]">
                  {formatDateKeyLabel(selectedDateKey)} 기록
                </h3>

                <article className="home-card mt-4 flex h-full flex-col rounded-[24px] border-0 bg-white shadow-none px-4 py-4 text-[#324763]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[11px] font-semibold text-[#6b81a7]">
                      {selectedDiary.categoryName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#8fa0b8]">
                      {selectedDiary.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                      {selectedDiary.isPrivate ? "비공개" : "공개"}
                    </span>
                  </div>

                  <h4 className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-[#2b4162]">
                    {selectedDiary.title}
                  </h4>

                  {resolveImageSrc(selectedDiary.imageUrl) ? (
                    <div className="relative mt-4 h-52 w-full overflow-hidden rounded-[16px] border border-[#dbe7fb]">
                      <Image
                        src={resolveImageSrc(selectedDiary.imageUrl) as string}
                        alt="일기 이미지"
                        fill
                        sizes="(max-width: 1024px) 100vw, 680px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

                  <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#5c7396]">
                    {selectedDiary.content}
                  </p>
                </article>
              </div>
            ) : (
              <div className="rounded-[22px] bg-white px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsMonthPickerOpen(true)}
                    className="rounded-full px-2 py-1 text-[18px] font-semibold tracking-[-0.02em] text-[#2b4162] transition hover:bg-[#eef5ff]"
                    aria-label="연도와 월 선택 모달 열기"
                  >
                    {formatMonthLabel(calendarMonth)}
                  </button>
                  <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#6c82a7]">
                    기록 {monthDiaries.length}개
                  </span>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-[#8ba0be]">
                  {weekDays.map((weekDay) => (
                    <span key={weekDay}>{weekDay}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: monthStartWeekDay }).map((_, index) => (
                    <div key={`calendar-spacer-${index}`} className="min-h-[62px]" aria-hidden="true" />
                  ))}
                  {calendarDays.map((day) => {
                    const count = diaryCountByDate.get(day.dateKey) ?? 0;
                    const selected = day.dateKey === selectedDateKey;
                    const isToday = day.dateKey === todayDateKey;
                    const isFutureDate = day.dateKey > todayDateKey;

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(day.dateKey);
                          setIsDiaryDetailOpen(count > 0);
                        }}
                        disabled={isFutureDate}
                        className={`relative min-h-[62px] rounded-[12px] border px-1 py-1 text-center transition ${
                          isFutureDate
                            ? "cursor-not-allowed border-[#edf2fa] bg-[#f7f9fd] text-[#b7c3d7]"
                            : selected
                              ? "border-[#8ab6ef] bg-[#eaf3ff] text-[#2f4b73]"
                              : "border-[#e3ecfb] bg-white text-[#4f6381] hover:border-[#c7dbfb]"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`inline-flex text-[12px] font-semibold ${isToday ? "rounded-full bg-[#dce9ff] px-1.5 py-0.5 text-[#38639c]" : ""}`}
                          >
                            {day.date.getDate()}
                          </span>
                          {count > 0 ? (
                            <span
                              className="mt-1 inline-flex items-center justify-center rounded-full bg-[#fff1f5] px-1.5 py-0.5 text-[#d77995]"
                              title="마음을 기록한 날"
                              aria-label="마음을 기록한 날"
                            >
                              <Heart size={10} fill="currentColor" strokeWidth={1.8} />
                            </span>
                          ) : (
                            <span className="mt-1 block text-[11px] text-[#b9c6da]">-</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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

                {isEditMode && editingDiaryId !== null ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete(editingDiaryId)}
                    disabled={isSubmitting}
                    className="w-full rounded-full border border-[#f1c3c3] bg-white px-4 py-2.5 text-sm font-semibold text-[#a95858] transition hover:border-[#eaa4a4] hover:text-[#8e3a3a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Trash2 size={14} /> 이 기록 삭제하기
                    </span>
                  </button>
                ) : null}
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

        {isMonthPickerOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2b3f]/30 px-4"
            onClick={() => setIsMonthPickerOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="연도와 월 선택"
              className="home-panel w-full max-w-sm rounded-[24px] border border-[#d8e6fb] bg-white px-5 py-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#233552]">연도/월 선택</h3>
                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d8e6fb] text-[#506582] transition hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                  aria-label="연월 선택 모달 닫기"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[14px] border border-[#d8e6fb] bg-[#f8fbff] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setMonthPickerYear((prev) => prev - 1)}
                  className="inline-flex items-center justify-center rounded-full border border-[#d8e6fb] bg-white p-2 text-[#506582] transition hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                  aria-label="이전 연도"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[18px] font-semibold text-[#2b4162]">{monthPickerYear}년</span>
                <button
                  type="button"
                  onClick={() => setMonthPickerYear((prev) => prev + 1)}
                  disabled={monthPickerYear >= new Date().getFullYear()}
                  className={`inline-flex items-center justify-center rounded-full border p-2 transition ${
                    monthPickerYear >= new Date().getFullYear()
                      ? "cursor-not-allowed border-[#e5edf9] bg-[#f5f8fe] text-[#bcc8db]"
                      : "border-[#d8e6fb] bg-white text-[#506582] hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                  }`}
                  aria-label="다음 연도"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {MONTH_PICKER_LABELS.map((monthLabel, monthIndex) => {
                  const candidateMonth = new Date(monthPickerYear, monthIndex, 1);
                  const isFutureMonth = toMonthKey(candidateMonth) > todayMonthKey;
                  const isSelectedMonth =
                    monthPickerYear === calendarMonth.getFullYear() &&
                    monthIndex === calendarMonth.getMonth();

                  return (
                    <button
                      key={`${monthPickerYear}-${monthLabel}`}
                      type="button"
                      disabled={isFutureMonth}
                      onClick={() => {
                        if (isFutureMonth) {
                          return;
                        }
                        setIsDiaryDetailOpen(false);
                        setCalendarMonth(startOfMonth(candidateMonth));
                        setIsMonthPickerOpen(false);
                      }}
                      className={`rounded-[12px] border px-2 py-2 text-sm font-semibold transition ${
                        isFutureMonth
                          ? "cursor-not-allowed border-[#edf2fa] bg-[#f7f9fd] text-[#b7c3d7]"
                          : isSelectedMonth
                            ? "border-[#8ab6ef] bg-[#eaf3ff] text-[#2f4b73]"
                            : "border-[#d8e6fb] bg-white text-[#506582] hover:border-[#bfd3f6] hover:text-[#2f4b73]"
                      }`}
                    >
                      {monthLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
