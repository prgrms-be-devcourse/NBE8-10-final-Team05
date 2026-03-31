import React, { useEffect, useState } from "react";
import { Loader2, Send, Coffee, CheckCircle } from "lucide-react";

// 실시간 상태에 따른 스타일 정의
const STATUS_CONFIG = {
  SENT: {
    label: "바다를 떠다니는 중",
    color: "text-slate-400",
    icon: <Send size={16} />,
  },
  ACCEPTED: {
    label: "상대방이 편지를 읽음",
    color: "text-amber-500",
    icon: <Coffee size={16} />,
  },
  WRITING: {
    label: "상대방이 답장을 작성 중...",
    color: "text-sky-500",
    icon: <Loader2 size={16} className="animate-spin" />,
  },
  REPLIED: {
    label: "답장 도착 완료",
    color: "text-green-500",
    icon: <CheckCircle size={16} />,
  },
};

export default function LetterStatusHeader({ letterId }: { letterId: number }) {
  const [status, setStatus] = useState<keyof typeof STATUS_CONFIG>("SENT");

  useEffect(() => {
    // 3초마다 상태를 체크하는 폴링 로직
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/letters/${letterId}/status`);
        const data = await res.json();
        if (data.data) setStatus(data.data);
      } catch (err) {
        console.error("상태 로드 실패", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [letterId]);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.SENT;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm w-fit transition-all duration-500`}
    >
      <span className={config.color}>{config.icon}</span>
      <span className={`text-xs font-bold ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}
