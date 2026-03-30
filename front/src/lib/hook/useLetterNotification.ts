"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/auth-store";

export const useLetterNotification = () => {
  const { isAuthenticated } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated || eventSourceRef.current) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    console.log("📡 SSE 연결 시도 중...");

    const es = new EventSource(`${cleanBaseUrl}/api/v1/letters/subscribe`, {
      withCredentials: true,
    });

    eventSourceRef.current = es;

    // ✅ [수정] any 제거: MessageEvent 타입 지정
    es.addEventListener("connect", (e: MessageEvent) => {
      console.log("🚀 SSE 연결 성공:", e.data);
    });

    // ✅ [수정] any 제거: MessageEvent 타입 지정
    es.addEventListener("new_letter", (e: MessageEvent) => {
      toast.success(e.data, {
        icon: "✉️",
        duration: 5000,
        position: "top-right",
      });
    });

    // ✅ [수정] any 제거: MessageEvent 타입 지정
    es.addEventListener("reply_arrival", (e: MessageEvent) => {
      toast.success(e.data, {
        icon: "✍️",
        duration: 5000,
        position: "top-right",
      });
    });

    // ✅ [수정] 미사용 error 변수 제거 (ESLint 경고 방지)
    es.onerror = () => {
      console.error("❌ SSE 연결 오류 발생");
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      if (eventSourceRef.current) {
        console.log("🔌 SSE 연결 해제");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated]);
};
