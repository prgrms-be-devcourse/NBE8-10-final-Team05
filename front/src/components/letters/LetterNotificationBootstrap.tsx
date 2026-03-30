"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { toast } from "react-hot-toast";

export default function LetterNotificationBootstrap() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // 로그인하지 않았으면 연결하지 않음
    if (!isAuthenticated) return;

    // 환경 변수에서 베이스 URL 가져오기 (없으면 상대 경로 사용)
    const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const baseUrl = rawBaseUrl.endsWith("/")
      ? rawBaseUrl.slice(0, -1)
      : rawBaseUrl;

    console.log("📡 실시간 편지 알림 구독 시작...");

    const eventSource = new EventSource(`${baseUrl}/api/v1/letters/subscribe`, {
      withCredentials: true,
    });

    // ✅ [수정] any 제거: MessageEvent 타입 지정
    eventSource.addEventListener("connect", (e: MessageEvent) => {
      console.log("🚀 SSE Connected:", e.data);
    });

    // ✅ [수정] 암시적 any 제거: MessageEvent 타입 지정
    // 1. 새로운 편지 도착 알림
    eventSource.addEventListener("new_letter", (event: MessageEvent) => {
      if (event.data !== "connected") {
        toast.success(event.data, {
          duration: 5000,
        });
      }
    });

    // ✅ [수정] 암시적 any 제거: MessageEvent 타입 지정
    // 2. 답장 도착 알림
    eventSource.addEventListener("reply_arrival", (event: MessageEvent) => {
      toast.success(event.data, {
        duration: 6000,
      });
    });

    // ✅ [수정] 에러 핸들링 시 미사용 변수 처리 (필요 없으면 생략 가능)
    eventSource.onerror = () => {
      console.error("❌ SSE 연결 에러 발생");
      eventSource.close();
    };

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      console.log("🔌 SSE 구독 해제");
      eventSource.close();
    };
  }, [isAuthenticated]);

  return null;
}
