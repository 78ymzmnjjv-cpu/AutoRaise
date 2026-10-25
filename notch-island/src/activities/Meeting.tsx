import { motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { clock, relMinutes } from "@/lib/utils";
import { Frame } from "@/ui/frame";
import { IslandButton } from "@/ui/button";
import { AvatarStack } from "@/ui/avatar";
import { Calendar } from "@/ui/icons";
import { PulseDot } from "@/ui/status";
import type { MeetingState } from "../../shared/types";
import type { View } from "./types";

const service = (url?: string) =>
  !url ? "" : url.includes("meet.google") ? "Google Meet" : url.includes("zoom") ? "Zoom" : url.includes("teams") ? "Teams" : "オンライン会議";

function Countdown({ m }: { m: MeetingState }) {
  const now = useNow(5000);
  return <>{m.start <= now ? "開始中" : relMinutes(m.start - now)}</>;
}

function Panel({ m }: { m: MeetingState }) {
  return (
    <Frame left={<><Calendar size={12} />次の予定</>} right={<Countdown m={m} />}>
      <div className="flex h-full flex-col gap-1">
        {/* 相対時刻と絶対時刻を両方出す */}
        <span className="text-[11px] text-zinc-400">
          {clock(m.start)} – {clock(m.end)}{m.joinUrl ? ` · ${service(m.joinUrl)}` : m.location ? ` · ${m.location}` : ""}
        </span>
        <span className="truncate text-[17px] font-semibold text-zinc-50">{m.title}</span>
        <div className="mt-auto flex items-center justify-between">
          {m.attendees.length ? <AvatarStack names={m.attendees} /> : <span />}
          {m.joinUrl && <IslandButton variant="go" onClick={() => api.joinMeeting(m.joinUrl!)}>参加する</IslandButton>}
        </div>
      </div>
    </Frame>
  );
}

export function meetingView(m: MeetingState, now: number): View | undefined {
  // 5分前からコンパクトに出す（それより前はホーム画面から見られる）
  const soon = m.start - now <= 5 * 60_000;
  const started = m.start <= now;
  return {
    key: "meeting",
    compact: soon
      ? {
          left: started ? <PulseDot color="var(--color-ok)" /> : <span className="size-2 rounded-full bg-sky-400" />,
          right: (
            <motion.span
              className="text-xs font-semibold text-zinc-100"
              // 開始1分前からは小さく脈打って注意を引く
              animate={m.start - now < 60_000 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Countdown m={m} />
            </motion.span>
          ),
          side: 76,
          tint: started ? "#052e16" : undefined,
        }
      : undefined,
    expanded: { width: 440, height: getGeometry().height + 112, node: <Panel m={m} /> },
  };
}
