"use client";

import type { ReactNode } from "react";
import SessionRevisionBoundary from "@/components/auth/SessionRevisionBoundary";

interface LettersLayoutProps {
  children: ReactNode;
}

/** letters subtree는 로그인 사용자 전환 시 local state를 모두 remount한다. */
export default function LettersLayout({ children }: LettersLayoutProps) {
  return <SessionRevisionBoundary>{children}</SessionRevisionBoundary>;
}
