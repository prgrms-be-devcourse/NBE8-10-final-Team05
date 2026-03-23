// components/letters/SendingAnimation.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Waves, Ship, Wind } from "lucide-react";

export default function SendingAnimation() {
  return (
    <div className="fixed inset-0 z-[100] bg-sky-100 flex flex-col items-center justify-center overflow-hidden">
      {/* 배경 파도 애니메이션 */}
      <motion.div
        animate={{
          x: [-20, 20, -20],
        }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 right-0 text-sky-200/50"
      >
        <Waves size={1200} strokeWidth={1} />
      </motion.div>

      <div className="relative flex flex-col items-center">
        {/* 유리병 & 편지 애니메이션 */}
        <motion.div
          initial={{ y: 100, opacity: 0, rotate: -20 }}
          animate={{
            y: [0, -15, 0],
            opacity: 1,
            rotate: [0, 5, -5, 0],
            x: [0, 100, 300, 600], // 오른쪽 멀리 떠나감
          }}
          transition={{
            y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            x: { duration: 4, ease: "easeIn" },
            opacity: { duration: 0.5 },
          }}
          className="relative z-10"
        >
          {/* 유리병 모양 커스텀 UI (아이콘 조합) */}
          <div className="relative w-24 h-40 bg-white/30 backdrop-blur-sm rounded-b-full rounded-t-3xl border-2 border-white/50 flex flex-col items-center justify-center shadow-xl">
            {/* 병 주둥이 */}
            <div className="absolute -top-4 w-8 h-6 bg-white/40 border-2 border-white/50 rounded-t-lg" />
            {/* 내부 편지지 */}
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="w-12 h-16 bg-amber-50 rounded-sm border border-amber-200 shadow-sm flex flex-col gap-1 p-2"
            >
              <div className="w-full h-1 bg-amber-200" />
              <div className="w-4/5 h-1 bg-amber-200" />
              <div className="w-full h-1 bg-amber-200" />
            </motion.div>
          </div>

          {/* 물보라 효과 */}
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/40 rounded-full blur-xl"
          />
        </motion.div>

        {/* 텍스트 메시지 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <h3 className="text-2xl font-bold text-sky-900 mb-2">
            마음을 병에 담는 중...
          </h3>
          <p className="text-sky-600 font-medium italic">
            당신의 진심이 곧 바다 건너 누군가에게 닿을 거예요.
          </p>
        </motion.div>
      </div>

      {/* 지나가는 구름 애니메이션 */}
      <motion.div
        animate={{ x: [-100, 1500] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-0 text-white opacity-40"
      >
        <Wind size={60} />
      </motion.div>
    </div>
  );
}
