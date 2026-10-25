import { motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { hueFrom, mmss } from "@/lib/utils";
import { Frame } from "@/ui/frame";
import { Waveform } from "@/ui/waveform";
import { Next, Pause, Play, Prev } from "@/ui/icons";
import type { MusicState } from "../../shared/types";
import type { View } from "./types";

function Artwork({ m, size }: { m: MusicState; size: number }) {
  const h = hueFrom(m.album || m.title);
  return (
    // layoutId で、コンパクトの小さなジャケットがそのまま大きくなる
    <motion.div
      layoutId="music-art"
      className="shrink-0 overflow-hidden bg-cover bg-center"
      style={{
        width: size,
        height: size,
        borderRadius: size > 40 ? 14 : 6,
        backgroundImage: m.artworkUrl ? `url("${m.artworkUrl}")` : `linear-gradient(135deg,hsl(${h} 85% 55%),hsl(${(h + 60) % 360} 70% 40%))`,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
    />
  );
}

function Player({ m }: { m: MusicState }) {
  const now = useNow(500, m.playing);
  const pos = Math.min(m.duration, m.position + (m.playing ? (now - m.sampledAt) / 1000 : 0));
  const pct = m.duration ? pos / m.duration : 0;
  return (
    <Frame left={<span>{m.app === "Spotify" ? "Spotify" : "ミュージック"}</span>} right={<Waveform active={m.playing} height={12} />}>
      <div className="flex h-full gap-4">
        <Artwork m={m} size={104} />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-zinc-50">{m.title}</div>
            <div className="truncate text-xs text-zinc-400">{m.artist}</div>
          </div>
          <div>
            <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
              <motion.div className="h-full rounded-full bg-zinc-100" animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.5, ease: "linear" }} />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500 tabular-nums">
              <span>{mmss(pos)}</span>
              <span>-{mmss(m.duration - pos)}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-7 text-zinc-100">
            <button aria-label="前の曲" className="rounded-full p-1 hover:text-white active:scale-90" onClick={() => api.music("previous")}><Prev size={18} /></button>
            <motion.button whileTap={{ scale: 0.85 }} aria-label={m.playing ? "一時停止" : "再生"} className="rounded-full p-1" onClick={() => api.music("playpause")}>
              {m.playing ? <Pause size={24} /> : <Play size={24} />}
            </motion.button>
            <button aria-label="次の曲" className="rounded-full p-1 hover:text-white active:scale-90" onClick={() => api.music("next")}><Next size={18} /></button>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function musicView(m: MusicState): View {
  return {
    key: "music",
    compact: { left: <Artwork m={m} size={22} />, right: <Waveform active={m.playing} /> },
    expanded: { width: 440, height: getGeometry().height + 136, node: <Player m={m} /> },
  };
}
