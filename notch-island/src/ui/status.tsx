import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** 線を描くように現れるチェック */
export function AnimatedCheck({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-ok", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="#052e16" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }} />
      </svg>
    </span>
  );
}

export function Spinner({ size = 16, color = "var(--color-live)" }: { size?: number; color?: string }) {
  return (
    <motion.span
      className="block shrink-0 rounded-full border-zinc-700"
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 7), borderTopColor: color }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

export function PulseDot({ color = "var(--color-rec)", size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
        animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  );
}

/** 文字の上を光が流れる（21st.dev の Shimmer Text と同じ表現）。処理中の文言に使う */
export function ShimmerText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.span
      className={cn("bg-clip-text text-transparent", className)}
      style={{ backgroundImage: "linear-gradient(90deg,#71717a 0%,#fafafa 50%,#71717a 100%)", backgroundSize: "200% 100%" }}
      animate={{ backgroundPosition: ["100% 0", "-100% 0"] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}
