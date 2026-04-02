"use client";

import { useState } from "react";
import {
  REPORT_REASON_OPTIONS,
  type ReportReasonCode,
} from "@/lib/report/report-types";

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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-xl rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.45)]">
        <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-[#223552]">
          {targetLabel} 신고하기
        </h3>
        <p className="mt-2 text-sm text-[#6f84a5]">
          사유를 선택하고 필요한 경우 추가 설명을 남겨주세요.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {REPORT_REASON_OPTIONS.map((reason) => {
            const active = selectedReason === reason.code;
            return (
              <button
                key={reason.code}
                type="button"
                onClick={() => setSelectedReason(reason.code)}
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

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="추가 설명(선택)"
          className="mt-4 h-[132px] w-full resize-y rounded-[12px] border border-[#d8e4f7] bg-white px-3 py-2 text-[14px] leading-7 text-[#2b4162] outline-none placeholder:text-[#9ab0cc] focus:border-[#8ab6ef] focus:ring-2 focus:ring-[#8ab6ef]/20"
        />

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
            onClick={() => void onSubmit(selectedReason, content)}
            disabled={isSubmitting}
            className={`rounded-[10px] px-4 py-2 text-sm font-semibold text-white ${
              isSubmitting
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
