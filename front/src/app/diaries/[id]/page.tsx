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

  // 데이터 로드
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

  // 삭제 처리 함수
  const handleDelete = async () => {
    if (
      !confirm(
        "정말로 이 기록을 삭제하시겠습니까?\n삭제된 내용은 복구할 수 없습니다.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await requestData(`/api/v1/diaries/${id}`, {
        method: "DELETE",
      });
      alert("기록이 삭제되었습니다.");
      router.push("/diaries");
      router.refresh();
    } catch (error: any) {
      console.error("삭제 실패:", error);
      alert(error.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-sky-400" size={48} />
      </div>
    );

  if (!diary) return null;

  return (
    <div className="min-h-screen bg-white text-slate-800 pb-20">
      {/* 상단 네비게이션 */}
      <header className="max-w-3xl mx-auto p-6 flex items-center justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-md">
        <button
          onClick={() => router.push("/diaries")}
          className="p-2 text-slate-400 hover:text-slate-600 transition-all"
        >
          <ChevronLeft size={28} />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/diaries/edit/${id}`)}
            className="text-slate-300 hover:text-sky-500 transition-all"
            title="수정하기"
          >
            <Edit3 size={20} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`transition-all ${isDeleting ? "text-slate-100" : "text-slate-300 hover:text-rose-400"}`}
            title="삭제하기"
          >
            {isDeleting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Trash2 size={20} />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-4">
        {/* 헤더 정보 */}
        <div className="mb-12 border-b border-slate-50 pb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">
            {diary.title}
          </h1>
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <span className="font-medium text-slate-600">{diary.nickname}</span>
            <span className="w-[1px] h-3 bg-slate-200" />
            <span>
              {new Date(diary.createDate).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {diary.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
          </div>
        </div>

        {/* 본문 영역 */}
        <article className="prose prose-slate max-w-none">
          {diary.content ? (
            <div
              className="community-content-view text-[17px] leading-[1.8] text-slate-700"
              dangerouslySetInnerHTML={{ __html: diary.content }}
            />
          ) : (
            <p className="text-center text-slate-300 py-20">
              내용이 없는 기록입니다.
            </p>
          )}
        </article>

        {/* 푸터 */}
        <div className="mt-32 flex flex-col items-center gap-2 opacity-10">
          <Waves size={32} className="text-sky-400" />
          <span className="text-sm font-bold tracking-widest">MAUM ON</span>
        </div>
      </main>

      <style jsx global>{`
        .community-content-view img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 24px auto;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .community-content-view {
          word-break: break-word;
          overflow-wrap: break-word;
        }
        /* 공백 라인 유지 */
        .community-content-view p:empty::before {
          content: "";
          display: inline-block;
          height: 1em;
        }
      `}</style>
    </div>
  );
}
