"use client";

import type { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface LettersLayoutProps {
  children: ReactNode;
}

/** letters subtree 전체에 인증 가드를 적용한다. */
export default function LettersLayout({ children }: LettersLayoutProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
