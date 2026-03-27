"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";
import { useAuthStore } from "@/lib/auth/auth-store";

interface SessionRevisionBoundaryProps {
  children: ReactNode;
}

/** 로그인 사용자 경계가 바뀌면 subtree를 remount해 화면 로컬 상태를 비운다. */
export default function SessionRevisionBoundary({
  children,
}: SessionRevisionBoundaryProps) {
  const { member, sessionRevision } = useAuthStore();
  const boundaryKey = `${member?.id ?? "guest"}:${sessionRevision}`;

  return <Fragment key={boundaryKey}>{children}</Fragment>;
}
