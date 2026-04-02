"use client";

import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

interface LettersLayoutProps {
  children: ReactNode;
}

/** * LettersLayout:
 * /letters 하위의 모든 페이지(메일함, 편지 쓰기, 읽기 등)에
 * 인증 가드와 실시간 SSE 알림 스트림을 전역적으로 유지합니다.
 */
export default function LettersLayout({ children }: LettersLayoutProps) {
  return (
    <ProtectedRoute>
      {/* NotificationProvider를 여기에 배치함으로써 
          /letters 내에서 페이지를 이동하더라도 SSE 연결이 초기화되지 않고 유지됩니다.
      */}
      <NotificationProvider>
        <div className="min-h-screen bg-[#EBF5FF]">{children}</div>
      </NotificationProvider>

      {/* 토스트 알림 설정 최적화 */}
      <Toaster
        position="top-right"
        toastOptions={{
          // 전체적인 디자인 톤을 앱과 맞춤
          className:
            "text-sm font-medium rounded-2xl shadow-lg border border-white/40 backdrop-blur-md",
          duration: 3000,
          style: {
            background: "rgba(255, 255, 255, 0.8)",
            color: "#334155",
          },
          success: {
            iconTheme: {
              primary: "#38bdf8", // sky-400
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#fb7185", // rose-400
              secondary: "#fff",
            },
          },
        }}
      />
    </ProtectedRoute>
  );
}
