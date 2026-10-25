import { motion } from "motion/react";
import { getGeometry } from "@/lib/store";
import { Frame } from "@/ui/frame";
import { ProgressRing } from "@/ui/progress-ring";
import { Bolt, Headphones } from "@/ui/icons";
import type { AirPodsState, PowerState } from "../../shared/types";
import type { View } from "./types";

const LOW = 20;
const levelColor = (v: number) => (v <= LOW ? "#f87171" : "#4ade80");

function Battery({ p }: { p: PowerState }) {
  return (
    <span className="flex items-center gap-1">
      <span className="relative h-[11px] w-[22px] rounded-[3px] border border-zinc-500 p-[1.5px]">
        <motion.span
          className="block h-full overflow-hidden rounded-[1.5px]"
          style={{ background: levelColor(p.percent) }}
          initial={{ width: 0 }}
          animate={{ width: `${p.percent}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          {/* 充電中だけ光が流れる */}
          {p.charging && (
            <motion.span className="block h-full w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent" animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.6, repeat: Infinity }} />
          )}
        </motion.span>
      </span>
    </span>
  );
}

export function powerFlashView(p: PowerState): View {
  return {
    key: "power",
    compact: {
      left: <span className="flex items-center gap-1 text-ok"><Bolt size={13} /><Battery p={p} /></span>,
      right: <span className="font-mono text-xs font-semibold" style={{ color: levelColor(p.percent) }}>{p.percent}%</span>,
      side: 72,
    },
  };
}

function Bud({ label, v }: { label: string; v?: number }) {
  if (v == null) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <ProgressRing value={v / 100} size={34} stroke={3.5} color={levelColor(v)}>
        <span className="font-mono text-[10px] text-zinc-100 tabular-nums">{v}</span>
      </ProgressRing>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  );
}

function AirPodsPanel({ a }: { a: AirPodsState }) {
  const low = [a.left, a.right, a.case].some((v) => v != null && v <= LOW);
  return (
    <Frame left={<><Headphones size={12} />接続しました</>}>
      <div className="flex h-full items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-zinc-50">{a.name}</div>
          {/* 色だけに頼らず、文言でも残量不足を伝える */}
          <div className={`text-[11px] ${low ? "text-red-400" : "text-zinc-500"}`}>{low ? "残量が少なくなっています" : "残量は十分です"}</div>
        </div>
        <div className="flex gap-3">
          <Bud label="左" v={a.left} />
          <Bud label="右" v={a.right} />
          <Bud label="ケース" v={a.case} />
        </div>
      </div>
    </Frame>
  );
}

export function airpodsView(a: AirPodsState): View {
  const min = Math.min(...[a.left, a.right].filter((v): v is number => v != null));
  return {
    key: "airpods",
    compact: { left: <Headphones size={15} className="text-zinc-100" />, right: <span className="font-mono text-xs" style={{ color: levelColor(min) }}>{min}%</span> },
    expanded: { width: 420, height: getGeometry().height + 84, node: <AirPodsPanel a={a} /> },
  };
}
