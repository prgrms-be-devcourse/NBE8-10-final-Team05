import type { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
