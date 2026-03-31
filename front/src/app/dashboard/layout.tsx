import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

/** 대시보드 하위 라우트에 인증 가드를 일괄 적용한다. */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <>{children}</>;
}
