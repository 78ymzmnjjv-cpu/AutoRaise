import { motion } from "motion/react";

interface Props {
  value: number; // 0〜1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

/** 円形プログレス。値の変化はバネで追従する */
export function ProgressRing({ value, size = 22, stroke = 3, color = "var(--color-live)", track = "#27272a", children }: Props) {
  const r = (size - stroke) / 2;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: Math.max(0.001, Math.min(1, value)) }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
