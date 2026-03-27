"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Lock,
  Loader2,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";
import { requestData, requestVoid } from "@/lib/api/http-client";
import { toErrorMessage } from "@/lib/api/rs-data";
import { useAuthStore } from "@/lib/auth/auth-store";

// --- 상수 및 설정 ---
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const CALENDAR_PAGE_SIZE = 30;
const getFullImageUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};
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

// --- 유틸리티 함수 ---
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKeyFromDateTime(dateTime: string): string {
  const parsed = new Date(dateTime);
  return Number.isNaN(parsed.getTime()) ? "" : toDateKey(parsed);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toMonthKeyFromDateKey(dateKey: string): string | null {
  const [year, month] = dateKey.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
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
  const [year, month, day] = dateKey.split("-");
  return `${year}.${month}.${day}`;
}

function buildCurrentMonthDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const current = new Date(year, monthIndex, index + 1);
    return { date: current, dateKey: toDateKey(current) };
  });
}

function isDiaryCategory(categoryName: string): categoryName is DiaryCategory {
  return DIARY_CATEGORIES.includes(categoryName as DiaryCategory);
}

export default function DashboardPage() {
  const { isAuthenticated, sessionRevision } = useAuthStore();
  // 상태 관리
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date()),
  );
  const [isDiaryDetailOpen, setIsDiaryDetailOpen] = useState(false);
  const [monthDiaries, setMonthDiaries] = useState<DiaryItem[]>([]);
  const monthDiaryCacheRef = useRef<Map<string, DiaryItem[]>>(new Map());

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() =>
    new Date().getFullYear(),
  );

  const [editingDiaryId, setEditingDiaryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryName, setCategoryName] = useState<DiaryCategory>("일상");
  const [isPrivate, setIsPrivate] = useState(true);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const isEditMode = editingDiaryId !== null;
  const todayDateKey = useMemo(() => toDateKey(new Date()), []);
  const todayMonthKey = useMemo(() => toMonthKey(new Date()), []);

  const calendarDays = useMemo(
    () => buildCurrentMonthDays(calendarMonth),
    [calendarMonth],
  );
  const monthStartWeekDay = useMemo(
    () => startOfMonth(calendarMonth).getDay(),
    [calendarMonth],
  );
  const diaryCountByDate = useMemo(() => {
    const counter = new Map<string, number>();
    monthDiaries.forEach((d) => {
      const key = toDateKeyFromDateTime(d.createDate);
      if (key) counter.set(key, (counter.get(key) ?? 0) + 1);
    });
    return counter;
  }, [monthDiaries]);

  const selectedDiary = useMemo(() => {
    return (
      monthDiaries.find(
        (d) => toDateKeyFromDateTime(d.createDate) === selectedDateKey,
      ) ?? null
    );
  }, [monthDiaries, selectedDateKey]);

  const loadMonthDiaries = useCallback(
    async (targetMonth: Date, options: { force?: boolean } = {}) => {
      const monthKey = toMonthKey(targetMonth);
      if (!options.force && monthDiaryCacheRef.current.has(monthKey)) {
        setMonthDiaries(monthDiaryCacheRef.current.get(monthKey)!);
        return;
      }
      try {
        const resp = await requestData<PageResponse<DiaryItem>>(
          `/api/v1/diaries?page=0&size=${CALENDAR_PAGE_SIZE}`,
        );
        const filtered = resp.content.filter(
          (d) =>
            toMonthKeyFromDateKey(toDateKeyFromDateTime(d.createDate)) ===
            monthKey,
        );
        setMonthDiaries(filtered);
        setTotalElements(resp.totalElements);
        monthDiaryCacheRef.current.set(monthKey, filtered);
      } catch (e) {
        setErrorMessage(toErrorMessage(e));
      }
    },
    [],
  );

  const handleRemoveImage = useCallback(async () => {
    if (!uploadedImageUrl) return;

    try {
      await requestVoid(
        `/api/v1/images?url=${encodeURIComponent(uploadedImageUrl)}`,
        {
          method: "DELETE",
        },
      );

      setUploadedImageUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setNoticeMessage("이미지가 삭제되었습니다.");
    } catch (err) {
      console.error("이미지 삭제 실패:", err);
      setUploadedImageUrl(null);
    }
  }, [uploadedImageUrl]);

  const resetForm = useCallback(() => {
    setEditingDiaryId(null);
    setTitle("");
    setContent("");
    setCategoryName("일상");
    setIsPrivate(true);
    setUploadedImageUrl(null);
    setFileInputKey((prev) => prev + 1);
    setErrorMessage(null);
    setNoticeMessage(null);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      monthDiaryCacheRef.current.clear();
      setMonthDiaries([]);
      setTotalElements(0);
      setIsDiaryDetailOpen(false);
      resetForm();
      return;
    }

    monthDiaryCacheRef.current.clear();
    setMonthDiaries([]);
    setTotalElements(0);
    setIsDiaryDetailOpen(false);
    resetForm();
    void loadMonthDiaries(calendarMonth, { force: true });
  }, [
    calendarMonth,
    isAuthenticated,
    loadMonthDiaries,
    resetForm,
    sessionRevision,
  ]);

  const applyDiaryToForm = useCallback((diary: DiaryItem) => {
    setEditingDiaryId(diary.id);
    setTitle(diary.title);
    setContent(diary.content);
    setCategoryName(
      isDiaryCategory(diary.categoryName) ? diary.categoryName : "기타",
    );
    setIsPrivate(diary.isPrivate);
    setUploadedImageUrl(diary.imageUrl);
    setNoticeMessage("수정 모드로 전환되었습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB를 초과할 수 없습니다.");
      return;
    }

    setIsImageUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const resp = await requestData<{ imageUrl: string }>(
        "/api/v1/images/upload",
        { method: "POST", body: formData },
      );
      const url = resp?.imageUrl;
      if (url) {
        setUploadedImageUrl(url);
      } else {
        setErrorMessage("업로드 응답에서 URL을 찾을 수 없습니다.");
      }
    } catch {
      setErrorMessage("이미지 업로드에 실패했습니다.");
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isImageUploading || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const diaryData = {
        title: title.trim(),
        content: content.trim(),
        categoryName,
        isPrivate,
        imageUrl: uploadedImageUrl ?? null,
      };

      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(diaryData)], { type: "application/json" }),
      );

      if (isEditMode) {
        await requestVoid(`/api/v1/diaries/${editingDiaryId}`, {
          method: "PUT",
          body: formData,
        });

        monthDiaryCacheRef.current.clear();
        await loadMonthDiaries(calendarMonth, { force: true });
        setNoticeMessage("일기가 성공적으로 수정되었습니다.");
        resetForm();
      } else {
        await requestData("/api/v1/diaries", {
          method: "POST",
          body: formData,
        });
        monthDiaryCacheRef.current.clear();
        await loadMonthDiaries(calendarMonth, { force: true });
        setNoticeMessage("오늘의 일기가 저장되었습니다.");
        resetForm();
      }
    } catch (err) {
      console.error("저장 에러:", err);
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (diaryId: number) => {
    if (!confirm("정말 이 일기를 삭제하시겠습니까?")) return;
    try {
      await requestVoid(`/api/v1/diaries/${diaryId}`, { method: "DELETE" });
      setNoticeMessage("일기가 삭제되었습니다.");
      monthDiaryCacheRef.current.clear();
      await loadMonthDiaries(calendarMonth, { force: true });
      setIsDiaryDetailOpen(false);
    } catch (e) {
      setErrorMessage(toErrorMessage(e));
    }
  };

  return (
    <div className="home-atmosphere min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 pt-7">
        <MainHeader />

        {/* 히어로 섹션 */}
        <section className="home-hero mt-8 flex flex-col items-start justify-center rounded-[36px] border-0 px-6 py-9 text-white shadow-none sm:px-10">
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-white/78">
            private diary
          </p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] sm:text-[34px]">
            나의 일기
          </h1>
          <p className="mt-2 max-w-[480px] text-[14px] leading-[1.7] text-white/88 sm:text-[15px]">
            오늘의 감정과 생각을 차분하게 기록하세요.
            <br />
            나만의 소중한 일상들이 차곡차곡 쌓이고 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] font-medium text-white/85 sm:text-[13px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
              <CalendarDays size={14} className="text-white" />
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
              <BookOpenText size={14} className="text-white" />총{" "}
              {totalElements}개의 기록
            </span>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* 캘린더/상세 영역 */}
          <div className="home-panel flex flex-col rounded-[34px] border-0 bg-white px-6 py-6 shadow-none sm:px-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#233552]">
                  {formatMonthLabel(calendarMonth)}
                </h2>
                <button
                  onClick={() => setIsMonthPickerOpen(true)}
                  className="rounded-full bg-[#f0f4f9] p-1.5 text-[#5c7396] transition hover:bg-[#e2eaf3] hover:text-[#233552]"
                >
                  <ChevronLeft size={16} className="-rotate-90" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarMonth((prev) => addMonth(prev, -1))}
                  className="rounded-full border border-[#e8eff9] p-2 text-[#5c7396] transition hover:bg-[#f5f8ff] hover:text-[#3b82f6]"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => {
                    setCalendarMonth(startOfMonth(new Date()));
                    setSelectedDateKey(todayDateKey);
                  }}
                  className="h-9 rounded-full border border-[#e8eff9] px-4 text-[13px] font-bold text-[#5c7396] transition hover:bg-[#f5f8ff] hover:text-[#3b82f6]"
                >
                  오늘
                </button>
                <button
                  disabled={toMonthKey(calendarMonth) === todayMonthKey}
                  onClick={() => setCalendarMonth((prev) => addMonth(prev, 1))}
                  className="rounded-full border border-[#e8eff9] p-2 text-[#5c7396] transition hover:bg-[#f5f8ff] hover:text-[#3b82f6] disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {isDiaryDetailOpen && selectedDiary ? (
              <div className="flex flex-1 flex-col overflow-hidden rounded-[22px] bg-[#f8fbff] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => setIsDiaryDetailOpen(false)}
                    className="group flex items-center gap-1.5 text-[13px] font-bold text-[#5c7396] transition hover:text-[#3b82f6]"
                  >
                    <ChevronLeft
                      size={16}
                      className="transition group-hover:-translate-x-0.5"
                    />
                    달력으로 돌아가기
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => applyDiaryToForm(selectedDiary)}
                      className="rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#5c7396] shadow-sm transition hover:text-[#3b82f6]"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(selectedDiary.id)}
                      className="rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-red-400 shadow-sm transition hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <article className="home-card flex flex-1 flex-col overflow-y-auto rounded-[24px] border border-[#e3ebf7] bg-white p-5 shadow-none sm:p-7">
                  <header className="mb-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded-full bg-[#ecf2ff] px-3 py-1 text-[11px] font-bold text-[#4a82f6]">
                        {selectedDiary.categoryName}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-[11px] font-bold text-gray-400">
                        {selectedDiary.isPrivate ? (
                          <Lock size={10} />
                        ) : (
                          <Globe size={10} />
                        )}
                        {selectedDiary.isPrivate ? "나만 보기" : "공개됨"}
                      </span>
                    </div>
                    <h3 className="text-[22px] font-bold tracking-[-0.02em] text-[#2b4162] sm:text-[24px]">
                      {selectedDiary.title}
                    </h3>
                    <time className="text-[13px] font-medium text-[#a1b3cd]">
                      {formatDateKeyLabel(
                        toDateKeyFromDateTime(selectedDiary.createDate),
                      )}
                    </time>
                  </header>

                  {selectedDiary.imageUrl && (
                    <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-[20px] bg-gray-50 shadow-sm">
                      <Image
                        key={selectedDiary.modifyDate}
                        src={`${getFullImageUrl(selectedDiary.imageUrl)!}?t=${new Date(selectedDiary.modifyDate).getTime()}`}
                        alt="일기 이미지"
                        fill
                        unoptimized
                        className="object-cover"
                        onError={(e) => {
                          console.error(
                            "이미지 로드 실패:",
                            e.currentTarget.currentSrc,
                          );
                        }}
                      />
                    </div>
                  )}

                  <div className="text-[15px] leading-[1.8] text-[#5c7396] sm:text-[16px]">
                    <p className="whitespace-pre-wrap">
                      {selectedDiary.content}
                    </p>
                  </div>
                </article>
              </div>
            ) : (
              <div className="flex flex-1 flex-col rounded-[22px] bg-[#f8fbff] p-4 sm:p-5">
                <div className="mb-4 grid grid-cols-7 gap-2 text-center text-[12px] font-bold tracking-wider text-[#a1b3cd] uppercase">
                  {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <span
                      key={day}
                      className={day === "일" ? "text-red-300" : ""}
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <div className="grid flex-1 grid-cols-7 gap-2">
                  {Array.from({ length: monthStartWeekDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-full" />
                  ))}
                  {calendarDays.map((day) => {
                    const count = diaryCountByDate.get(day.dateKey) ?? 0;
                    const isToday = day.dateKey === todayDateKey;
                    const isSelected = day.dateKey === selectedDateKey;
                    const isFuture = day.dateKey > todayDateKey;

                    return (
                      <button
                        key={day.dateKey}
                        onClick={() => {
                          setSelectedDateKey(day.dateKey);
                          if (count > 0) setIsDiaryDetailOpen(true);
                        }}
                        disabled={isFuture}
                        className={`group relative flex h-[72px] flex-col items-center justify-center rounded-[18px] border transition-all duration-200 sm:h-[84px] ${
                          isFuture
                            ? "cursor-not-allowed border-transparent opacity-20"
                            : isSelected
                              ? "scale-[1.02] border-[#8ab6ef] bg-white text-[#3b82f6] shadow-[0_8px_20px_-6px_rgba(59,130,246,0.15)] ring-2 ring-[#3b82f6]/5"
                              : "border-[#eef3fa] bg-white text-[#5c7396] hover:scale-[1.02] hover:border-[#3b82f6]/30 hover:shadow-md"
                        }`}
                      >
                        <span
                          className={`text-[14px] font-bold ${
                            isToday
                              ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-sm"
                              : ""
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        {count > 0 ? (
                          <div className="mt-1.5 flex h-4 items-center justify-center">
                            <Heart
                              size={12}
                              className={`transition-colors ${
                                isSelected
                                  ? "text-red-400"
                                  : "text-red-200 group-hover:text-red-300"
                              }`}
                              fill="currentColor"
                            />
                            {count > 1 && (
                              <span className="ml-0.5 text-[9px] font-bold opacity-60">
                                {count}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 작성/수정 폼 영역 */}
          <aside className="flex flex-col gap-5">
            <div className="home-panel sticky top-6 rounded-[28px] border-0 bg-white p-5 shadow-none sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ecf2ff] text-[#4a82f6]">
                    {isEditMode ? (
                      <Plus className="rotate-45" size={18} />
                    ) : (
                      <BookOpenText size={18} />
                    )}
                  </div>
                  <h2 className="text-[18px] font-bold tracking-tight text-[#2b4162]">
                    {isEditMode ? "기록 수정하기" : "오늘의 기록"}
                  </h2>
                </div>
                {isEditMode && (
                  <button
                    onClick={resetForm}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition hover:bg-gray-100"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-[#a1b3cd] uppercase">
                    일기 제목
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="h-11 rounded-xl border border-[#eef3fa] bg-[#f8fbff] px-4 text-[14px] font-medium transition placeholder:text-[#b7c3d7] focus:border-[#3b82f6]/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/5"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-[#a1b3cd] uppercase">
                    카테고리 선택
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {DIARY_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryName(cat)}
                        className={`h-9 rounded-lg border text-[12px] font-bold transition ${
                          categoryName === cat
                            ? "border-[#3b82f6] bg-[#3b82f6] text-white shadow-sm"
                            : "border-[#eef3fa] bg-white text-[#5c7396] hover:border-[#3b82f6]/30"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-[#a1b3cd] uppercase">
                    기록 내용
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="오늘 하루는 어땠나요?"
                    className="min-h-[160px] w-full resize-none rounded-xl border border-[#eef3fa] bg-[#f8fbff] p-4 text-[14px] leading-[1.6] font-medium transition placeholder:text-[#b7c3d7] focus:border-[#3b82f6]/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/5"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold tracking-wider text-[#a1b3cd] uppercase">
                    대표 이미지
                  </label>
                  <div className="group relative flex h-36 w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#eef3fa] transition hover:border-[#3b82f6]/30 bg-[#f8fbff]">
                    {uploadedImageUrl ? (
                      <div className="group relative h-full w-full">
                        <Image
                          src={getFullImageUrl(uploadedImageUrl)!}
                          alt="미리보기"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100 backdrop-blur-[2px]">
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 transition hover:bg-[#f0f4f9]">
                        <div className="rounded-full bg-white p-2.5 text-[#5c7396] shadow-sm">
                          <Plus size={20} />
                        </div>
                        <span className="text-[12px] font-bold text-[#b7c3d7]">
                          사진 추가하기
                        </span>
                        <input
                          ref={fileInputRef}
                          key={fileInputKey}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}

                    {/* 업로드 로딩 표시 */}
                    {isImageUploading && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-[2px]">
                        <Loader2
                          className="animate-spin text-[#3b82f6]"
                          size={24}
                        />
                        <span className="mt-2 text-[11px] font-bold text-[#3b82f6]">
                          이미지 처리 중...
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between rounded-xl bg-[#f8fbff] px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isPrivate ? (
                      <Lock size={14} className="text-[#3b82f6]" />
                    ) : (
                      <Globe size={14} className="text-[#3b82f6]" />
                    )}
                    <span className="text-[13px] font-bold text-[#5c7396]">
                      {isPrivate ? "나만 보기" : "전체 공개"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
                      isPrivate ? "bg-[#3b82f6]" : "bg-[#d1dbe9]"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        isPrivate ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isImageUploading}
                  className="group relative mt-2 flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[#3b82f6] text-[15px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,0.3)] transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:bg-[#d1dbe9] disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : isEditMode ? (
                    "수정 완료"
                  ) : (
                    "저장하기"
                  )}
                </button>
              </form>

              {noticeMessage && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg bg-blue-50 px-4 py-3 text-[12px] font-bold text-blue-600 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {noticeMessage}
                </div>
              )}
              {errorMessage && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg bg-red-50 px-4 py-3 text-[12px] font-bold text-red-500 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  {errorMessage}
                </div>
              )}
            </div>
          </aside>
        </section>

        {/* 월 선택 모달 */}
        {isMonthPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b4b]/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-[320px] animate-in zoom-in-95 duration-200 overflow-hidden rounded-[28px] bg-white p-6 shadow-2xl border border-[#eef3fa]">
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={() => setMonthPickerYear((p) => p - 1)}
                  className="rounded-full p-2 text-[#5c7396] hover:bg-[#f5f8ff]"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-[18px] font-bold text-[#233552]">
                  {monthPickerYear}년
                </span>
                <button
                  onClick={() => setMonthPickerYear((p) => p + 1)}
                  disabled={monthPickerYear >= new Date().getFullYear()}
                  className="rounded-full p-2 text-[#5c7396] hover:bg-[#f5f8ff] disabled:opacity-20"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTH_PICKER_LABELS.map((monthLabel, monthIndex) => {
                  const candidateMonth = new Date(
                    monthPickerYear,
                    monthIndex,
                    1,
                  );
                  const isFutureMonth =
                    toMonthKey(candidateMonth) > todayMonthKey;
                  const isSelectedMonth =
                    monthPickerYear === calendarMonth.getFullYear() &&
                    monthIndex === calendarMonth.getMonth();

                  return (
                    <button
                      key={`${monthPickerYear}-${monthLabel}`}
                      type="button"
                      disabled={isFutureMonth}
                      onClick={() => {
                        if (isFutureMonth) return;
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
              <button
                onClick={() => setIsMonthPickerOpen(false)}
                className="mt-6 w-full rounded-xl bg-gray-50 py-2.5 text-xs font-bold text-gray-400 hover:bg-gray-100 transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
