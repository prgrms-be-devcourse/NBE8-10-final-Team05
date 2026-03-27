import type { ReactNode } from "react";

interface LettersLayoutProps {
  children: ReactNode;
}

/** letters subtree 전체에 인증 가드를 적용한다. */
export default function LettersLayout({ children }: LettersLayoutProps) {
  return <>{children}</>;
}
