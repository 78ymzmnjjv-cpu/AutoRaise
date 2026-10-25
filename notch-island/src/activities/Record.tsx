import { api, getGeometry } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { mmss } from "@/lib/utils";
import { Frame } from "@/ui/frame";
import { IslandButton } from "@/ui/button";
import { PulseDot } from "@/ui/status";
import { Waveform } from "@/ui/waveform";
import { Mic } from "@/ui/icons";
import type { RecordState } from "../../shared/types";
import type { View } from "./types";

function Elapsed({ since }: { since: number }) {
  const now = useNow(500);
  return <span className="font-mono tabular-nums">{mmss((now - since) / 1000)}</span>;
}

function RecordingPanel({ r }: { r: RecordState }) {
  return (
    <Frame left={<><PulseDot />画面収録中</>} right={r.startedAt && <Elapsed since={r.startedAt} />}>
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-zinc-300">{r.micInUse ? "マイクの音も入っています" : "画面のみ"}</span>
          <Waveform active={r.micInUse} color="var(--color-rec)" bars={14} height={18} />
        </div>
        <IslandButton variant="rec" onClick={api.recordStop}>停止して保存</IslandButton>
      </div>
    </Frame>
  );
}

function MicPanel() {
  return (
    <Frame left={<><Mic size={12} />マイク使用中</>}>
      <div className="flex h-full items-center justify-between">
        <span className="text-[13px] text-zinc-300">どこかのアプリがマイクを使っています</span>
        <Waveform color="#f59e3b" bars={10} height={16} />
      </div>
    </Frame>
  );
}

/** プライバシーに関わる表示なので、他のどの機能よりも優先して出す */
export function recordView(r: RecordState): View | undefined {
  if (r.active && r.startedAt) {
    return {
      key: "record",
      compact: { left: <PulseDot />, right: <span className="text-xs text-zinc-100"><Elapsed since={r.startedAt} /></span>, tint: "#2a0a0a" },
      expanded: { width: 440, height: getGeometry().height + 84, node: <RecordingPanel r={r} /> },
    };
  }
  if (r.micInUse) {
    return {
      key: "mic",
      compact: { left: <span className="size-2 rounded-full bg-live" />, right: <Mic size={13} className="text-live" /> },
      expanded: { width: 420, height: getGeometry().height + 70, node: <MicPanel /> },
    };
  }
  return undefined;
}

export function recordSavedView(r: RecordState): View {
  const s = r.lastSaved;
  return {
    key: "record-saved",
    compact: {
      left: s?.thumb ? <img src={s.thumb} alt="" className="h-5 w-8 rounded object-cover" /> : <span className="h-5 w-8 rounded bg-zinc-700" />,
      right: (
        <button className="text-xs text-zinc-100 underline-offset-2 hover:underline" onClick={api.revealRecording}>
          保存しました
        </button>
      ),
      side: 96,
    },
  };
}
