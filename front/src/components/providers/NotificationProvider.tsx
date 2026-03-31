"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/auth-store";

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 1. 로그아웃 시 기존 연결 종료
    if (!isAuthenticated) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // 2. 중복 연결 방지
    if (eventSourceRef.current) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    console.log("📡 통합 알림 시스템 SSE 연결 시작...");

    // [중요] 백엔드 리팩토링된 공통 알림 경로 사용
    const es = new EventSource(
      `${cleanBaseUrl}/api/v1/notifications/subscribe`,
      {
        withCredentials: true,
      },
    );

    eventSourceRef.current = es;

    es.addEventListener("connect", (e: any) => {
      console.log("🚀 SSE 연결 성공:", e.data);
    });

    // 편지 도착 이벤트
    es.addEventListener("new_letter", (e: MessageEvent) => {
      toast.success(e.data, { icon: "✉️", duration: 5000 });
      // 다른 컴포넌트(MailboxPage 등)에게 데이터 갱신이 필요함을 알림
      window.dispatchEvent(new CustomEvent("notification_received"));
    });

    // 답장 도착 이벤트
    es.addEventListener("reply_arrival", (e: MessageEvent) => {
      toast.success(e.data, { icon: "✍️", duration: 5000 });
      window.dispatchEvent(new CustomEvent("notification_received"));
    });

    es.onerror = (error) => {
      console.error("SSE 연결 오류:", error);
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [isAuthenticated]);

  return <>{children}</>;
};
