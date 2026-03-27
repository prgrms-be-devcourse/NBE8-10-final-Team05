import type { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface StoryWriteLayoutProps {
  children: ReactNode;
}

/** 고민 나누기 작성 화면은 로그인 사용자만 접근할 수 있다. */
export default function StoryWriteLayout({ children }: StoryWriteLayoutProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
