"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Lock,
  Globe,
  Waves,
  Calendar,
  User,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";
import Link from "next/link";

interface Diary {
  id: number;
  title: string;
  content: string;
  categoryName: string;
  nickname: string;
  createDate: string;
  isPrivate: boolean;
}

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

type DiaryTab = "my" | "public";

export default function DiaryListPage() {
  const [activeTab, setActiveTab] = useState<DiaryTab>("my");
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint =
        activeTab === "my" ? "/api/v1/diaries" : "/api/v1/diaries/public";
      const response = await requestData<PageResponse<Diary>>(endpoint);
      if (response && response.content) {
        setDiaries(response.content);
      }
    } catch (error) {
      console.error("Failed to fetch diaries", error);
      setDiaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void fetchDiaries();
  }, [fetchDiaries]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-sky-100">
      {/* 상단 헤더: 수정 페이지와 톤앤매너 통일 */}
      <header className="sticky top-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
            <Waves size={22} />
          </div>
          <span className="text-xl font-black text-slate-800 tracking-tight">
            마음온
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-8 w-[1px] bg-slate-200 mx-2" />
          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <User size={18} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-6 py-12 flex-grow">
        {/* 타이틀 및 탭 섹션 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">
              {activeTab === "my" ? "나의 기록들" : "모두의 이야기"}
            </h2>
            <p className="text-slate-500 font-medium">
              오늘 당신의 마음은 어떤 색이었나요?
            </p>
          </div>

          <div className="bg-slate-200/50 p-1.5 rounded-[20px] flex gap-1 self-start">
            {(["my", "public"] as DiaryTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2.5 rounded-[14px] text-sm font-bold transition-all duration-300 ${
                  activeTab === tab
                    ? "bg-white text-sky-600 shadow-md transform scale-[1.02]"
                    : "text-slate-500 hover:bg-white/50"
                }`}
              >
                {tab === "my" ? "내 기록" : "공개 피드"}
              </button>
            ))}
          </div>
        </div>

        {/* 리스트 출력부 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[300px] bg-slate-100 rounded-[32px] animate-pulse"
              />
            ))}
          </div>
        ) : diaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {diaries.map((diary) => (
              <Link
                href={`/diaries/${diary.id}`}
                key={diary.id}
                className="group"
              >
                <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 flex flex-col h-[320px] relative overflow-hidden">
                  {/* 상단 장식 요소 */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />

                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-500 bg-sky-50 px-3 py-1.5 rounded-lg">
                      {diary.categoryName}
                    </span>
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                      {diary.isPrivate ? (
                        <Lock size={16} />
                      ) : (
                        <Globe size={16} />
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors relative z-10">
                    {diary.title}
                  </h3>

                  <div className="flex-grow relative z-10">
                    <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                      {diary.content.replace(/<[^>]*>?/gm, "")}{" "}
                      {/* HTML 태그 제거 로직 추가 */}
                    </p>
                  </div>

                  <div className="pt-6 mt-4 border-t border-slate-50 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                      <Calendar size={14} />
                      {new Date(diary.createDate).toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-1 text-sky-500 font-black text-xs opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      읽어보기 <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <Inbox size={40} />
            </div>
            <p className="text-xl font-bold text-slate-400 mb-2">
              아직 기록이 없어요
            </p>
            <p className="text-slate-400 text-sm mb-8">
              첫 번째 이야기를 들려주시겠어요?
            </p>
            <Link href="/diaries/write">
              <button className="px-8 py-3 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-100">
                기록 시작하기
              </button>
            </Link>
          </div>
        )}
      </main>

      {/* Floating Action Button: 수정 페이지 아이콘 스타일과 통일 */}
      <Link href="/diaries/write">
        <button className="fixed bottom-10 right-10 w-16 h-16 bg-gradient-to-tr from-sky-400 to-blue-500 text-white rounded-[24px] shadow-[0_15px_30px_rgba(14,165,233,0.4)] flex items-center justify-center hover:scale-110 hover:-rotate-6 transition-all active:scale-95 group z-50">
          <Plus
            size={32}
            className="group-hover:rotate-90 transition-transform duration-500"
          />
        </button>
      </Link>
    </div>
  );
}
