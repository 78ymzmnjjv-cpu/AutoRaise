import { getConfig, getGeometry } from "@/lib/store";
import { remainingOf, timer, type TimerState } from "@/lib/timer";
import { useNow } from "@/lib/useNow";
import { mmss } from "@/lib/utils";
import { Frame } from "@/ui/frame";
import { IslandButton } from "@/ui/button";
import { ProgressRing } from "@/ui/progress-ring";
import type { View } from "./types";

const color = (t: TimerState) => (t.phase === "break" ? "var(--color-ok)" : "#2dd4bf");

function Remaining({ t, className }: { t: TimerState; className?: string }) {
  const now = useNow(250, !t.paused);
  return <span className={`font-mono tabular-nums ${className ?? ""}`}>{mmss(remainingOf(t, now) / 1000)}</span>;
}

function Ring({ t, size, stroke }: { t: TimerState; size: number; stroke: number }) {
  const now = useNow(1000, !t.paused);
  return <ProgressRing value={remainingOf(t, now) / t.totalMs} size={size} stroke={stroke} color={color(t)} />;
}

function Panel({ t }: { t: TimerState }) {
  const sets = getConfig().focus.sets;
  return (
    <Frame left={<span>{t.phase === "work" ? "集中" : "休憩"}</span>} right={<span>{t.set} / {sets} セット</span>}>
      <div className="flex h-full items-center gap-5">
        <Ring t={t} size={84} stroke={7} />
        <div className="flex flex-col gap-2">
          {/* 数字は等幅でガタつかせない */}
          <Remaining t={t} className="text-[40px] leading-none font-bold text-zinc-50" />
          <div className="flex gap-2">
            <IslandButton size="sm" onClick={timer.toggle}>{t.paused ? "再開" : "一時停止"}</IslandButton>
            <IslandButton size="sm" onClick={timer.skip}>スキップ</IslandButton>
            <IslandButton size="sm" variant="ghost" onClick={timer.stop}>終了</IslandButton>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function timerView(t: TimerState): View | undefined {
  if (t.phase === "idle") return undefined;
  const justSwitched = Date.now() - t.flashedAt < 2500;
  return {
    key: "timer",
    compact: {
      left: <Ring t={t} size={20} stroke={3} />,
      right: <Remaining t={t} className="text-xs text-zinc-100" />,
      // 集中→休憩に切り替わった直後は緑に光らせて知らせる
      tint: justSwitched && t.phase === "break" ? "#14532d" : undefined,
    },
    expanded: { width: 400, height: getGeometry().height + 112, node: <Panel t={t} /> },
  };
}
