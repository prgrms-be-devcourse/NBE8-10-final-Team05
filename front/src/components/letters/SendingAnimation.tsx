"use client";

import { motion } from "framer-motion";
import { Waves, Wind } from "lucide-react";

const LETTER_BOTTLE_OUTLINE_PATH =
  "M56.5 43L59.5 43L65 48.5L68.5 53Q70.3 49.4 75.5 49L80 55.5L77 59.5L94.5 76Q101.2 69.7 116.5 72Q133.5 76 142 88.5L172.5 127L181 131L182 135.5L135.5 182L133.5 182L131 181Q129.3 173.5 123.5 169L87.5 141L78 131.5L72 117.5L72 103.5L76 93.5L58.5 77Q58 80.5 53.5 80L49 75.5L49 73.5L53 68.5L43 59.5L43 56.5L56.5 43ZM58 45L45 58L45 60L53 65L55 67L67 55L61 47L58 45ZM74 51L51 74L51 76L55 78L78 56L76 53Q77 50 74 51ZM75 61L61 76L78 92L86 84L87 85Q76 92 73 108L74 119L81 133L127 170L135 164L128 172L132 179L135 180L180 134L173 129L172 128L164 135L170 128L138 87Q129 76 113 73Q100 73 94 78L90 81L92 78L75 61Z";

function FloatingLetterBottle({ size = 240 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="40 40 145 145"
      fill="none"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
    >
      <g transform="translate(225 0) scale(-1 1)">
        <path fill="#fffbf3" d="M58 42L56 43L43 56L42 60L52 69L48 74L48 76L53 80Q58 81 59 78L75 94L71 104Q70 114 72 122L80 136L125 171L130 181L134 183L137 182L183 135L182 132L173 126L138 83Q130 74 117 71Q102 69 95 74L94 75L78 60L80 57L80 53L76 48Q70 48 69 52L66 49L60 42L58 42Z" />
        <path fill="#bee2fd" d="M73.5 52Q76.8 50.9 76 53.5L77 55.5L54.5 77L52 76L52 73.5L73.5 52Z" />
        <path
          fill="#bee2fd"
          d="M74.5 62L91 77.5L89 80.5Q91.2 84.2 93.5 79Q98.7 74.7 107.5 74L125 90.5L128 94.5Q122.7 96.7 124 105.5L124.5 107L109.5 85Q103.3 85.8 100.5 90L95.5 86Q85.9 92.9 83 106.5L87.5 112L117 131.5L135.5 160L138.5 161L146 158L147 155.5L144 148.5L145.5 149L152.5 152L156.5 147Q159.5 146.1 158 150.5L159 154.5L138.5 175L137 173.5L134 166.5Q137.8 164.8 134.5 163L130.5 164L88 129.5Q78 120.5 78 101.5L80 93.5L87 85.5L87 83L81.5 87L66 70.5L74.5 62Z"
        />
        <path fill="#fae093" d="M57.5 45L63 49.5L66 55.5L59 61.5L57.5 59L51 55L50 52.5L57.5 45Z" />
        <path fill="#fae093" d="M108.5 88L109 91.5Q106 92.5 107 97.5L108 100Q101 98.7 98.5 103L95 99.5L104.5 90L108.5 88Z" />
        <path fill="#fae093" d="M95.5 90L98 91.5L92 100.5L96 105.5L88.5 109Q85.5 108.5 86 104.5Q88.9 95.4 95.5 90Z" />
        <path fill="#fae093" d="M110 93L113 94.5L127 117.5L121.5 123L118.5 120L99 108L102.5 103Q108.5 104.5 110 101.5L110 93Z" />
        <path fill="#fae093" d="M129.5 119L157 136.5L157 140.5L151.5 148L142.5 144Q140.3 144.8 141 148.5L143 152.5L140 150.5L124 124.5L129.5 119Z" />
        <path fill="#600448" d={LETTER_BOTTLE_OUTLINE_PATH} />
        <path
          fill="#600448"
          d="M107.5 86Q111.5 85.5 112 88.5L125.5 110L126 107.5Q123.3 105.8 125 99.5L128.5 95Q134.8 93.8 136 97.5L137 102.5L135 110.5L132 114.5L144.5 116L152 121.5Q152.8 123.8 150.5 123Q145.6 115 132 117Q130.9 119.7 133.5 119L159 135.5L159 141.5L152.5 151L143.5 147L144 148.5L146 156.5Q143.8 160.8 136.5 160L115.5 129L84 107.5Q83.4 101.4 86 98.5L95.5 87L100.5 91L107.5 86ZM107 88L103 91L95 100L98 103L102 101L108 101Q106 93 110 90L107 88ZM96 90L87 101L86 108L89 109Q94 110 96 106Q98 107 97 105L93 102Q93 95 99 93L96 90ZM110 92L109 95L110 101Q109 103 104 102L94 110Q91 109 92 112L117 128L128 118L113 94L110 92ZM131 96L127 99Q126 109 130 115L132 113L135 105L134 99L131 96ZM129 119L122 127L119 129L119 131L137 158Q142 159 144 156L141 145L145 145L152 149Q157 145 158 138L155 134L131 119L129 119Z"
        />
      </g>
    </svg>
  );
}

export default function SendingAnimation() {
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[linear-gradient(180deg,#e7f4ff_0%,#dff0ff_45%,#d1ebff_100%)]">
      <motion.div
        animate={{ x: [-20, 30, -20], y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        className="absolute -top-24 left-1/2 h-72 w-[140%] -translate-x-1/2 rounded-[50%] bg-[#d4ecff]"
      />

      <motion.div
        animate={{ x: [-80, 50, -80] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="absolute bottom-6 left-[-10%] right-[-10%] text-[#a9d6fb]/70 transform-gpu will-change-transform"
      >
        <Waves size={1500} strokeWidth={1.4} />
      </motion.div>

      <motion.div
        animate={{ x: [50, -40, 50] }}
        transition={{ repeat: Infinity, duration: 4.6, ease: "easeInOut" }}
        className="absolute bottom-0 left-[-10%] right-[-10%] text-white/55 transform-gpu will-change-transform"
      >
        <Waves size={1450} strokeWidth={1.8} />
      </motion.div>

      <motion.div
        animate={{ x: [-160, 1400] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute top-24 left-0 text-white/35"
      >
        <Wind size={68} />
      </motion.div>

      <motion.div
        animate={{ x: [-300, 1200] }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear", delay: 1.5 }}
        className="absolute top-44 left-0 text-white/18"
      >
        <Wind size={112} />
      </motion.div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div className="relative flex w-full max-w-5xl items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 0.32, 0.2], scale: [0.72, 1.08, 1.2] }}
            transition={{ duration: 2.1, ease: "easeOut" }}
            className="absolute bottom-[6%] h-20 w-64 rounded-full bg-[#8fc4ef]/45 blur-[34px]"
          />

          <motion.div
            initial={{ x: -236, y: 34, opacity: 0, rotate: -5, scale: 0.95 }}
            animate={{ x: 224, y: 6, opacity: 1, rotate: 2.6, scale: 1 }}
            transition={{
              x: { duration: 3.8, ease: [0.18, 0.54, 0.24, 1] },
              y: { duration: 3.8, ease: [0.33, 1, 0.68, 1] },
              rotate: { duration: 3.8, ease: [0.18, 0.54, 0.24, 1] },
              scale: { duration: 3.8, ease: [0.18, 0.54, 0.24, 1] },
              opacity: { duration: 0.55, ease: "easeOut" },
            }}
            className="relative transform-gpu will-change-transform"
            style={{ translate: "0 0", transformOrigin: "50% 62%" }}
          >
            <motion.div
              animate={{
                y: [0, -1, -3, -2, -4, -3, -5, -4, -6],
                rotate: [-0.2, 0.05, 0.25, 0.15, 0.45, 0.28, 0.6, 0.35, 0.72],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.9,
                times: [0, 0.1, 0.22, 0.34, 0.48, 0.62, 0.76, 0.9, 1],
                ease: "easeInOut",
              }}
              className="relative transform-gpu will-change-transform"
              style={{ translate: "0 0", transformOrigin: "50% 62%" }}
            >
              <FloatingLetterBottle size={248} />
            </motion.div>

            <motion.div
              animate={{
                x: [-2, 0, 2, 1, 3, 2],
                scale: [0.98, 1, 1.03, 1.02, 1.05, 1.03],
                opacity: [0.12, 0.15, 0.2, 0.18, 0.23, 0.2],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.9,
                times: [0, 0.16, 0.34, 0.56, 0.8, 1],
                ease: "easeInOut",
              }}
              className="absolute -bottom-1 left-1/2 h-10 w-28 -translate-x-1/2 rounded-full bg-white/30 blur-lg"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <h3 className="text-[30px] font-semibold tracking-[-0.04em] text-[#264a74]">
            마음을 병에 담아 띄우는 중...
          </h3>
          <p className="mt-3 text-[16px] font-medium text-[#5f86b4]">
            당신의 진심이 파도 위를 따라 천천히 멀어지고 있어요.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
