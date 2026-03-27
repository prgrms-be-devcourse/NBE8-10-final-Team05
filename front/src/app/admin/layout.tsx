import type { ReactNode } from "react";
import AdminRoute from "@/components/auth/AdminRoute";
import AdminShell from "@/components/admin/AdminShell";

interface AdminLayoutProps {
  children: ReactNode;
}

/** 관리자 하위 라우트 전체에 인증/권한 가드를 적용한다. */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminRoute>
      <AdminShell>{children}</AdminShell>
    </AdminRoute>
  );
}
