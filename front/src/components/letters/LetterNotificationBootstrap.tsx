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

    // 연결 확인용 (서버에서 'connect' 이벤트를 보낼 경우)
    eventSource.addEventListener("connect", (e: any) => {
      console.log("🚀 SSE Connected:", e.data);
    });

    // 1. 새로운 편지 도착 알림
    eventSource.addEventListener("new_letter", (event) => {
      if (event.data !== "connected") {
        toast.success(event.data, {
          duration: 5000,
        });
      }
    });

    // 2. 답장 도착 알림
    eventSource.addEventListener("reply_arrival", (event) => {
      toast.success(event.data, {
        duration: 6000,
      });
    });

    // 에러 핸들링 및 자동 닫기
    eventSource.onerror = (error) => {
      console.error("❌ SSE 연결 에러:", error);
      // 에러 발생 시 연결을 닫아 리소스 낭비를 방지하거나,
      // 필요 시 setTimeout을 이용해 재연결 로직을 짤 수 있습니다.
      eventSource.close();
    };

    // 컴포넌트 언마운트 시 연결 해제 (중요!)
    return () => {
      console.log("🔌 SSE 구독 해제");
      eventSource.close();
    };
  }, [isAuthenticated]);

  return null;
}
