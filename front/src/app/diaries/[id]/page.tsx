"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Lock,
  Globe,
  Waves,
  Trash2,
  Edit3,
  Loader2,
  Calendar,
  User,
  Share2,
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";

interface DiaryDetail {
  id: number;
  title: string;
  categoryName: string;
  nickname: string;
  createDate: string;
  isPrivate: boolean;
  content: string;
}

export default function DiaryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [diary, setDiary] = useState<DiaryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await requestData<DiaryDetail>(`/api/v1/diaries/${id}`);
        setDiary(data);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        alert("기록을 불러올 수 없습니다.");
        router.push("/diaries");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id, router]);

  const handleDelete = async () => {
    if (
      !confirm(
        "정말로 이 기록을 삭제하시겠습니까?\n삭제된 내용은 복구할 수 없습니다.",
      )
    )
      return;

    setIsDeleting(true);
    try {
      await requestData(`/api/v1/diaries/${id}`, { method: "DELETE" });
      alert("기록이 삭제되었습니다.");
      router.push("/diaries");
    } catch (error: any) {
      alert(error.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-sky-400 mb-4" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">
          마음을 불러오는 중...
        </p>
      </div>
    );

  if (!diary) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-32 font-sans selection:bg-sky-100">
      {/* 상단 네비게이션: 플로팅 스타일 */}
      <nav className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between sticky top-0 z-50 bg-[#F8FAFC]/80 backdrop-blur-xl">
        <button
          onClick={() => router.push("/diaries")}
          className="group flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-500 hover:text-sky-500 transition-all hover:shadow-md active:scale-95"
        >
          <ChevronLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-sm font-bold">뒤로가기</span>
        </button>

        <div className="flex gap-3">
          <button className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-sky-500 transition-all hover:shadow-md">
            <Share2 size={18} />
          </button>
          <button
            onClick={() => router.push(`/diaries/edit/${id}`)}
            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-sky-500 transition-all hover:shadow-md"
            title="수정하기"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 transition-all hover:shadow-md disabled:opacity-50"
            title="삭제하기"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 mt-8">
        {/* 히어로 섹션 (헤더 정보) */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-4 py-1.5 bg-sky-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-sky-100">
              {diary.categoryName}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-slate-400 text-[11px] font-bold">
              {diary.isPrivate ? (
                <>
                  <Lock size={12} /> 나만 보기
                </>
              ) : (
                <>
                  <Globe size={12} /> 전체 공개
                </>
              )}
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-[1.2] tracking-tight">
            {diary.title}
          </h1>

          <div className="flex items-center justify-between py-6 border-y border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 overflow-hidden">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">
                  {diary.nickname}
                </p>
                <p className="text-[12px] font-medium text-slate-400">작성자</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-slate-800 flex items-center justify-end gap-1.5">
                <Calendar size={14} className="text-sky-500" />
                {new Date(diary.createDate).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-[12px] font-medium text-slate-400">
                기록된 날짜
              </p>
            </div>
          </div>
        </header>

        {/* 본문 영역: 잡지 스타일 텍스트 레이아웃 */}
        <article className="relative">
          {/* 큰 인용구 같은 장식 요소 (선택사항) */}
          <div className="absolute -left-12 top-0 text-slate-100 select-none hidden">
            <Waves size={80} />
          </div>

          {diary.content ? (
            <div
              className="diary-content-view text-[18px] leading-[2] text-slate-700 font-medium"
              dangerouslySetInnerHTML={{ __html: diary.content }}
            />
          ) : (
            <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
              <p className="text-slate-300 font-bold italic">
                기록된 내용이 비어있습니다.
              </p>
            </div>
          )}
        </article>

        {/* 푸터 데코레이션 */}
        <footer className="mt-40 flex flex-col items-center">
          <div className="w-24 h-[1px] bg-slate-200 mb-12" />
          <div className="flex flex-col items-center gap-3 opacity-20 hover:opacity-100 transition-opacity duration-500">
            <div className="w-12 h-12 bg-sky-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
              <Waves size={24} />
            </div>
            <span className="text-xs font-black tracking-[0.4em] text-slate-900">
              MAUM ON
            </span>
          </div>
        </footer>
      </main>

      {/* 전역 스타일 개선 */}
      <style jsx global>{`
        .diary-content-view {
          word-break: break-word;
          overflow-wrap: break-word;
        }

        /* 1. 문단 간격 조절 */
        .diary-content-view p {
          margin-bottom: 2rem;
        }

        /* 2. 이미지 및 감싸는 블럭(figure) 초기화 */
        .diary-content-view figure {
          margin: 3.5rem 0;
          padding: 0;
          border: none !important;
          background: none !important;
          box-shadow: none !important;
          cursor: default !important; /* 드래그 커서 제거 */
        }

        .diary-content-view img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 0 auto;
          border-radius: 2rem; /* 작성 페이지와 동일한 곡률 */
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.08); /* 부드러운 그림자 */
          border: 1px solid rgba(0, 0, 0, 0.03);
          transition: transform 0.3s ease;
        }

        /* 상세 페이지에서는 호버 시 살짝 커지기만 함 (삭제버튼 X) */
        .diary-content-view img:hover {
          transform: translateY(-4px);
        }

        /* 3. 삭제 버튼 강제 숨김 */
        .diary-content-view .remove-btn {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* 빈 줄 높이 확보 */
        .diary-content-view p:empty::before,
        .diary-content-view p br {
          content: "";
          display: block;
          height: 1.2em;
        }

        /* 에디터에서 들어간 group 클래스 등의 효과 제거 */
        .diary-content-view .group:hover img {
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  );
}
