import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

interface LettersLayoutProps {
  children: ReactNode;
}

/** letters subtree 전체에 인증 가드와 실시간 알림을 적용 */
export default function LettersLayout({ children }: LettersLayoutProps) {
  return (
    <ProtectedRoute>
      <NotificationProvider>{children}</NotificationProvider>
      <Toaster position="top-right" />
    </ProtectedRoute>
  );
}
