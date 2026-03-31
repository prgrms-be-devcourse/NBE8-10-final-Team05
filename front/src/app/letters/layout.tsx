import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

interface LettersLayoutProps {
  children: ReactNode;
}

/** letters subtree 전체에 실시간 알림과 인증 가드를 적용 */
export default function LettersLayout({ children }: LettersLayoutProps) {
  return (
    <>
      <NotificationProvider>{children}</NotificationProvider>

      <Toaster position="top-right" />
    </>
  );
}
