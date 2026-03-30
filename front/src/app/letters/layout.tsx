import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import LetterNotificationBootstrap from "@/components/letters/LetterNotificationBootstrap";

interface LettersLayoutProps {
  children: ReactNode;
}

/** letters subtree 전체에 실시간 알림과 인증 가드를 적용 */
export default function LettersLayout({ children }: LettersLayoutProps) {
  return (
    <>
      {/* 1. 실시간 알림 수신기 (Client Component로 분리됨) */}
      <LetterNotificationBootstrap />

      {/* 2. 페이지 내용 */}
      {children}

      {/* 3. 토스트 팝업 (알림창 시각화) */}
      <Toaster position="top-right" />
    </>
  );
}
