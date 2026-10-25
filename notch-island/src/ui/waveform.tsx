import { motion } from "motion/react";

/** 再生中・録音中を示す小さなイコライザー */
export function Waveform({ active = true, color = "var(--color-live)", bars = 5, height = 14 }: { active?: boolean; color?: string; bars?: number; height?: number }) {
  return (
    <div className="flex items-center gap-[2px]" style={{ height }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: color }}
          animate={active ? { height: [height * 0.25, height, height * 0.4, height * 0.8, height * 0.3] } : { height: height * 0.2 }}
          transition={active ? { duration: 1.1, repeat: Infinity, repeatType: "mirror", delay: i * 0.13, ease: "easeInOut" } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}
