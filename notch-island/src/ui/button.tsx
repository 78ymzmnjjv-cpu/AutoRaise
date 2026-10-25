import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  go: "bg-ok text-green-950 hover:bg-green-400",
  warn: "bg-live text-orange-950 hover:bg-amber-300",
  rec: "bg-rec text-white hover:bg-red-400",
  ghost: "bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
} as const;

export interface IslandButtonProps extends HTMLMotionProps<"button"> {
  variant?: keyof typeof VARIANTS;
  size?: "sm" | "md" | "icon";
}

/** 島の中で使う丸いボタン。押すと少し縮む（21st.dev の pressable と同じ考え方） */
export function IslandButton({ variant = "default", size = "md", className, ...props }: IslandButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-live",
        size === "sm" && "h-6 px-2.5 text-[11px]",
        size === "md" && "h-8 px-3.5 text-xs",
        size === "icon" && "size-8",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
