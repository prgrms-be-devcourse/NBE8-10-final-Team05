"use client";

import { useEffect, useMemo, useState } from "react";
import {
  REPORT_REASON_OPTIONS,
  type ReportReasonCode,
} from "@/lib/report/report-types";

const REPORT_CONTENT_MAX_LENGTH = 300;
const OTHER_REASON_MIN_LENGTH = 5;

interface ReportCreateDialogProps {
  open: boolean;
  targetLabel: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (reason: ReportReasonCode, content: string) => Promise<void>;
}

export default function ReportCreateDialog({
  open,
  targetLabel,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ReportCreateDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReasonCode>("PROFANITY");
  const [content, setContent] = useState("");

  const selectedReasonOption = useMemo(() => {
    return REPORT_REASON_OPTIONS.find((reason) => reason.code === selectedReason) ?? REPORT_REASON_OPTIONS[0];
  }, [selectedReason]);

  const normalizedContent = content.trim();
  const contentLength = content.length;
  const requiresDescription = selectedReasonOption.requiresDescription === true;
  const validationMessage = useMemo(() => {
    if (contentLength > REPORT_CONTENT_MAX_LENGTH) {
      return `추가 설명은 ${REPORT_CONTENT_MAX_LENGTH}자 이하로 작성해 주세요.`;
    }

    if (requiresDescription && normalizedContent.length < OTHER_REASON_MIN_LENGTH) {
      return `기타 사유는 최소 ${OTHER_REASON_MIN_LENGTH}자 이상 설명해 주세요.`;
    }

    return null;
  }, [contentLength, normalizedContent.length, requiresDescription]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-[#223552]">
          {targetLabel} 신고하기
        </h3>
        <p className="mt-2 text-sm text-[#6f84a5]">
          운영팀이 빠르게 판단할 수 있도록 가장 가까운 사유를 선택해 주세요.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {REPORT_REASON_OPTIONS.map((reason) => {
            const active = selectedReason === reason.code;
            return (
              <button
                key={reason.code}
                type="button"
                onClick={() => setSelectedReason(reason.code)}
                aria-pressed={active}
                className={`rounded-[12px] px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#4f8cf0] text-white"
                    : "bg-[#f6f9ff] text-[#5f7598] hover:bg-[#edf5ff]"
                }`}
              >
                {reason.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[14px] bg-[#f7fbff] px-4 py-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#88a0c3] uppercase">
            선택한 사유
          </p>
          <p className="mt-2 text-sm font-semibold text-[#29405f]">{selectedReasonOption.label}</p>
          <p className="mt-1 text-sm leading-6 text-[#607898]">{selectedReasonOption.hint}</p>
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, REPORT_CONTENT_MAX_LENGTH))}
          placeholder={
            requiresDescription
              ? "운영팀이 이해할 수 있도록 상황을 구체적으로 적어 주세요."
              : "추가 설명이 있다면 남겨 주세요."
          }
          className="mt-4 h-[132px] w-full resize-y rounded-[12px] border border-[#d8e4f7] bg-white px-3 py-2 text-[14px] leading-7 text-[#2b4162] outline-none placeholder:text-[#9ab0cc] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
        />

        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <p className={`${validationMessage ? "text-[#b85c5c]" : "text-[#8ea3c0]"}`}>
            {requiresDescription
              ? `기타 사유는 ${OTHER_REASON_MIN_LENGTH}자 이상 설명이 필요합니다.`
              : "허위 신고나 보복성 신고는 운영 정책에 따라 제한될 수 있습니다."}
          </p>
          <span className={`${contentLength >= REPORT_CONTENT_MAX_LENGTH ? "text-[#b85c5c]" : "text-[#8ea3c0]"}`}>
            {contentLength}/{REPORT_CONTENT_MAX_LENGTH}
          </span>
        </div>

        {validationMessage ? (
          <div className="mt-3 rounded-[12px] border border-[#f2d4d4] bg-[#fff8f8] px-3 py-2 text-sm text-[#9a4b4b]">
            {validationMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-3 rounded-[12px] border border-[#f3d0d0] bg-[#fff8f8] px-3 py-2 text-sm text-[#9a4b4b]">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-[10px] bg-[#edf2f9] px-4 py-2 text-sm font-semibold text-[#5f7598] disabled:cursor-not-allowed disabled:opacity-70"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void onSubmit(selectedReason, normalizedContent)}
            disabled={isSubmitting || validationMessage !== null}
            className={`rounded-[10px] px-4 py-2 text-sm font-semibold text-white ${
              isSubmitting || validationMessage !== null
                ? "cursor-not-allowed bg-[#b6c9e7]"
                : "bg-[#4f8cf0] hover:bg-[#3f80eb]"
            }`}
          >
            {isSubmitting ? "접수 중..." : "신고 접수"}
          </button>
        </div>
      </div>
    </div>
  );
}
