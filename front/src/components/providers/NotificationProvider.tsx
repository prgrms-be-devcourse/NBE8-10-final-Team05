"use client";

import React, { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/auth-store";
import { getPublicApiBaseUrl, joinUrl } from "@/lib/runtime/deployment-env";

const API_BASE_URL = getPublicApiBaseUrl();

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    if (eventSourceRef.current) return;

    console.log("📡 통합 알림 시스템 SSE 연결 시작...");

    const es = new EventSource(
      joinUrl(API_BASE_URL, "/api/v1/notifications/subscribe"),
      {
        withCredentials: true,
      },
    );

    eventSourceRef.current = es;

    es.addEventListener("connect", (e: MessageEvent) => {
      console.log("🚀 SSE 연결 성공:", e.data);
    });

    // 편지 도착 이벤트
    es.addEventListener("new_letter", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data); // ✨ JSON 파싱 추가
        toast.success(data.message || "새로운 편지가 도착했습니다!", {
          icon: "✉️",
          duration: 5000,
        });
      } catch {
        // 만약 기존처럼 단순 문자열이 올 경우를 대비한 예외 처리
        toast.success(e.data, { icon: "✉️", duration: 5000 });
      }
      window.dispatchEvent(new CustomEvent("notification_received"));
    });

    // 2. 편지 읽음 상태 이벤트
    es.addEventListener("letter_read", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        toast.success(data.message || "상대방이 편지를 읽었습니다.", {
          icon: "📖",
          duration: 5000,
        });
      } catch {
        toast.success(e.data, { icon: "📖", duration: 5000 });
      }
      window.dispatchEvent(new CustomEvent("notification_received"));
    });

    // 3. 작성 중 상태 (이건 데이터 갱신만 하면 되니 파싱 불필요)
    es.addEventListener("writing_status", () => {
      window.dispatchEvent(new CustomEvent("notification_received"));
    });

    // 4. 답장 도착 이벤트
    es.addEventListener("reply_arrival", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        toast.success(data.message || "답장이 도착했습니다!", {
          icon: "✍️",
          duration: 5000,
        });
      } catch {
        toast.success(e.data, { icon: "✍️", duration: 5000 });
      }
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
