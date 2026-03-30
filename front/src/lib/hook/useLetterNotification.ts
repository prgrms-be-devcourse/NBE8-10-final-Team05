"use client";
import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/auth-store";

export const useLetterNotification = () => {
  const { isAuthenticated } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 로그인이 안 되어 있거나 이미 연결된 소켓이 있다면 중단
    if (!isAuthenticated || eventSourceRef.current) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    // URL 생성 시 슬래시 중복 방지
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    console.log("📡 SSE 연결 시도 중...");

    const es = new EventSource(`${cleanBaseUrl}/api/v1/letters/subscribe`, {
      withCredentials: true,
    });

    eventSourceRef.current = es;

    // 연결 성공 (서버에서 'connect' 이벤트를 보낼 때)
    es.addEventListener("connect", (e: any) => {
      console.log("🚀 SSE 연결 성공:", e.data);
    });

    // 새 편지 알림
    es.addEventListener("new_letter", (e: any) => {
      toast.success(e.data, {
        icon: "✉️",
        duration: 5000,
        position: "top-right",
      });
    });

    // 답장 도착 알림
    es.addEventListener("reply_arrival", (e: any) => {
      toast.success(e.data, {
        icon: "✍️",
        duration: 5000,
        position: "top-right",
      });
    });

    es.onerror = (error) => {
      console.error("❌ SSE 연결 오류 발생:", error);
      es.close();
      eventSourceRef.current = null;
    };

    // [중요] Cleanup 함수: 컴포넌트가 언마운트되거나 리프레시될 때 연결을 확실히 닫음
    return () => {
      if (eventSourceRef.current) {
        console.log("🔌 SSE 연결 해제");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated]); // isAuthenticated가 바뀔 때만 재실행
};
