import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import type { View } from "@/activities/types";

export type Mode = "idle" | "compact" | "expanded";

// すべての変形に使う共通のバネ。開くときにわずかにオーバーシュートする
const SPRING = { type: "spring", stiffness: 400, damping: 30, mass: 0.9 } as const;
const DEFAULT_SIDE = 64;

interface Props {
  mode: Mode;
  view?: View;
  onDragState: (dragging: boolean) => void;
  onDropFiles: (files: File[]) => void;
}

export function Island({ mode, view, onDragState, onDropFiles }: Props) {
  const g = getGeometry();
  const compact = view?.compact;
  const expanded = view?.expanded;

  let width = g.width;
  let height = g.height;
  let radius = g.height / 2.6;
  if (mode === "compact" && compact) {
    width = g.width + 2 * (compact.side ?? DEFAULT_SIDE);
    radius = g.height / 2;
  } else if (mode === "expanded" && expanded) {
    width = expanded.width;
    height = expanded.height;
    radius = 30;
  }
  // ノッチの無い Mac では、待機中は見えない当たり判定だけにする
  const invisible = mode === "idle" && !g.hasNotch;
  const tint = mode === "compact" ? compact?.tint : undefined;

  // 当たり判定は目標の大きさで先に送る（アニメーション中のちらつきを避ける）
  useEffect(() => {
    api.setHitRect({ x: (g.windowWidth - width) / 2, y: 0, width, height });
  }, [width, height, g.windowWidth]);

  const contentKey = mode === "idle" ? "idle" : `${view?.key}-${mode}`;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
      <motion.div
        className="pointer-events-auto relative overflow-hidden text-zinc-100"
        initial={false}
        animate={{
          width,
          height,
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius,
          backgroundColor: invisible ? "rgba(0,0,0,0)" : tint ?? "#000000",
          boxShadow: mode === "expanded" ? "0 18px 50px rgba(0,0,0,0.45)" : "0 0 0 rgba(0,0,0,0)",
        }}
        transition={SPRING}
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes("Files")) onDragState(true);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragState(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDragState(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length) onDropFiles(files);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={contentKey}
            className="absolute inset-x-0 top-0 flex justify-center"
            // 形より先に消え、形が落ち着く頃に現れる
            initial={{ opacity: 0, filter: "blur(4px)", scale: 0.96 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1, transition: { duration: 0.2, delay: 0.06 } }}
            exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98, transition: { duration: 0.12 } }}
          >
            {mode === "compact" && compact && (
              <div className="flex items-center justify-between px-3" style={{ width, height }}>
                <div className="flex min-w-0 items-center justify-start" style={{ width: (compact.side ?? DEFAULT_SIDE) - 12 }}>{compact.left}</div>
                <div className="flex min-w-0 items-center justify-end" style={{ width: (compact.side ?? DEFAULT_SIDE) - 12 }}>{compact.right}</div>
              </div>
            )}
            {mode === "expanded" && expanded && <div style={{ width: expanded.width, height: expanded.height }}>{expanded.node}</div>}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
