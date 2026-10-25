import { motion } from "motion/react";
import { getGeometry } from "@/lib/store";
import { Frame } from "@/ui/frame";
import { Bell, Calendar, Clip, Rec, Spark, Timer, Tray } from "@/ui/icons";
import type { NotchState } from "../../shared/types";
import type { View } from "./types";

export type HomeTarget = "timer" | "record" | "ai" | "shelf" | "clipboard" | "notices" | "meeting";

interface Tile {
  key: HomeTarget;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function Panel({ tiles, cols, onPick }: { tiles: Tile[]; cols: number; onPick: (k: HomeTarget) => void }) {
  const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const date = new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  return (
    <Frame left={<span>{date}</span>} right={<span className="font-mono">{time}</span>}>
      <motion.div
        className="grid h-full gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
      >
        {tiles.map((t) => (
          <motion.button
            key={t.key}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onPick(t.key)}
            className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-live"
          >
            {t.icon}
            <span className="text-[11px]">{t.label}</span>
            {!!t.badge && <span className="absolute top-1.5 right-2 min-w-4 rounded-full bg-zinc-700 px-1 font-mono text-[9px] leading-4 text-zinc-100">{t.badge}</span>}
          </motion.button>
        ))}
      </motion.div>
    </Frame>
  );
}

export function homeView(s: NotchState, onPick: (k: HomeTarget) => void): View {
  const tiles: Tile[] = [
    { key: "ai", label: "AI に質問", icon: <Spark size={18} /> },
    { key: "timer", label: "集中タイマー", icon: <Timer size={18} /> },
    { key: "record", label: s.record.active ? "収録を停止" : "画面収録", icon: <Rec size={18} /> },
    { key: "shelf", label: "シェルフ", icon: <Tray size={18} />, badge: s.shelf.length },
    { key: "clipboard", label: "コピー履歴", icon: <Clip size={18} />, badge: s.clipboard.length },
    { key: "notices", label: "通知", icon: <Bell size={18} />, badge: s.notices.length },
  ];
  if (s.meeting) tiles.push({ key: "meeting", label: "次の予定", icon: <Calendar size={18} /> });
  // 空きマスが出ないように、6個なら3列×2、7個なら4列×2
  const cols = tiles.length <= 6 ? 3 : 4;
  const rows = Math.ceil(tiles.length / cols);
  return { key: "home", expanded: { width: 440, height: getGeometry().height + 16 + rows * 70, node: <Panel tiles={tiles} cols={cols} onPick={onPick} /> } };
}
