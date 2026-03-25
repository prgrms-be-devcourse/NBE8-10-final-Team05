"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Lock,
  Globe,
  Calendar,
  Waves,
  ChevronRight,
  BookOpen,
  Loader2,
} from "lucide-react";
import { requestData } from "@/lib/api/http-client";
import Link from "next/link"; // 기존 상세페이지와 동일한 라이브러리 사용

// 백엔드 응답 타입 정의
interface Diary {
  id: number;
  title: string;
  content: string;
  categoryName: string;
  nickname: string;
  createDate: string;
  isPrivate: boolean;
}

// Spring Boot Page 객체 구조 타입
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

  // 데이터 불러오기 함수
  const fetchDiaries = async () => {
    setIsLoading(true);
    try {
      // 상세페이지처럼 requestData 사용
      const endpoint =
        activeTab === "my" ? "/api/v1/diaries" : "/api/v1/diaries/public";

      // requestData가 RsData<T> 구조를 자동으로 파싱한다고 가정할 때:
      // 만약 requestData가 data 필드만 반환한다면 아래와 같이 작성합니다.
      const response = await requestData<PageResponse<Diary>>(endpoint);

      if (response && response.content) {
        setDiaries(response.content);
      }
    } catch (error) {
      console.error("일기 목록을 가져오는데 실패했습니다.", error);
      setDiaries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiaries();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#EBF5FF] text-slate-800 flex flex-col font-sans selection:bg-blue-100">
      {/* Header (생략 - 기존 디자인 유지) */}
      <header className="flex items-center justify-between px-8 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center text-white">
            <Waves size={20} />
          </div>
          <span className="text-xl font-bold text-sky-900">마음온</span>
        </div>
        {/* ... 중략 ... */}
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-12">
        {/* 탭 버튼부 */}
        <div className="flex flex-col items-center mb-16">
          <div className="bg-white/40 p-1.5 rounded-2xl flex gap-2 shadow-sm">
            <button
              onClick={() => setActiveTab("my")}
              className={`px-10 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === "my"
                  ? "bg-white text-sky-600 shadow-md"
                  : "text-slate-500 hover:text-sky-400"
              }`}
            >
              나의 기록
            </button>
            <button
              onClick={() => setActiveTab("public")}
              className={`px-10 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === "public"
                  ? "bg-white text-sky-600 shadow-md"
                  : "text-slate-500 hover:text-sky-400"
              }`}
            >
              함께 보기
            </button>
          </div>

          <Link href="/diaries/write">
            <button className="fixed bottom-10 right-10 w-16 h-16 bg-sky-400 text-white rounded-[2rem] shadow-2xl shadow-sky-200 flex items-center justify-center hover:bg-sky-500 hover:scale-110 transition-all active:scale-95 group z-50">
              <Plus
                size={32}
                className="group-hover:rotate-90 transition-transform duration-300"
              />
            </button>
          </Link>
        </div>

        {/* 리스트 출력부 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-sky-300" size={48} />
            <p className="text-sky-300 font-bold">기록을 불러오는 중...</p>
          </div>
        ) : diaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {diaries.map((diary) => (
              <Link href={`/diaries/${diary.id}`} key={diary.id}>
                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm border border-white hover:scale-[1.03] transition-all group flex flex-col h-[320px] cursor-pointer">
                  {/* 기존 카드 내용 유지 */}
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-50 px-3 py-1 rounded-full">
                      {diary.categoryName}
                    </span>
                    {diary.isPrivate ? (
                      <Lock size={14} className="text-slate-300" />
                    ) : (
                      <Globe size={14} className="text-sky-200" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    {diary.title}
                  </h3>
                  {/* <p className="text-slate-500 text-sm line-clamp-4 flex-grow">
                    {diary.content}
                  </p> */}
                  <div className="pt-6 border-t border-slate-50 flex justify-between items-center text-[11px] font-bold text-slate-600">
                    {diary.nickname} |{" "}
                    {new Date(diary.createDate).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 text-slate-400">
            작성된 일기가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
