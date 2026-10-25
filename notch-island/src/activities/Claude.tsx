import { AnimatePresence, motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { mmss } from "@/lib/utils";
import { Frame } from "@/ui/frame";
import { IslandButton } from "@/ui/button";
import { AnimatedCheck, PulseDot, ShimmerText, Spinner } from "@/ui/status";
import type { ClaudeSession, PermissionRequest } from "../../shared/types";
import type { View } from "./types";

const ClaudeMark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#D97757" d="M12 2l1.6 6.4L20 7l-4.6 4.6L22 14l-6.6.6L17 21l-5-4.2L7 21l1.6-6.4L2 14l6.6-2.4L4 7l6.4 1.4z" />
  </svg>
);

const doneCount = (s: ClaudeSession) => s.steps.filter((x) => x.status === "done").length;

function Elapsed({ s }: { s: ClaudeSession }) {
  const now = useNow(1000, s.status !== "done");
  return <span className="font-mono tabular-nums">{mmss(((s.endedAt ?? now) - s.startedAt) / 1000)}</span>;
}

function Steps({ s }: { s: ClaudeSession }) {
  const steps = s.steps.slice(-4);
  return (
    <motion.ul className="flex flex-col gap-1.5" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
      <AnimatePresence initial={false}>
        {steps.map((st) => (
          <motion.li
            key={st.id}
            layout
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-2.5 text-[13px] ${st.status === "running" ? "text-zinc-50" : "text-zinc-400"}`}
          >
            {st.status === "done" ? <AnimatedCheck size={16} /> : st.status === "error" ? <span className="grid size-4 place-items-center rounded-full bg-rec text-[10px] font-bold">!</span> : <Spinner size={16} />}
            <span className="truncate">{st.status === "running" ? <ShimmerText>{st.label}</ShimmerText> : st.label}</span>
          </motion.li>
        ))}
      </AnimatePresence>
      {!steps.length && <li className="text-[13px] text-zinc-500">{s.prompt || "考えています…"}</li>}
    </motion.ul>
  );
}

function SessionPanel({ s }: { s: ClaudeSession }) {
  return (
    <Frame left={<><ClaudeMark />Claude Code</>} right={<Elapsed s={s} />}>
      <div className="flex h-full flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-semibold text-zinc-50">{s.project}</span>
          <span className="shrink-0 text-[11px] text-zinc-500">{s.status === "done" ? "完了" : `${doneCount(s)} 件完了`}</span>
        </div>
        <Steps s={s} />
      </div>
    </Frame>
  );
}

function PermissionPanel({ p }: { p: PermissionRequest }) {
  const now = useNow(1000);
  const left = Math.max(0, Math.round((p.expiresAt - now) / 1000));
  return (
    <Frame left={<><PulseDot color="var(--color-live)" />許可が必要</>} right={<span className="font-mono tabular-nums">{left}s</span>}>
      <div className="flex h-full flex-col gap-2">
        <div className="text-[13px] text-zinc-400">
          <span className="font-semibold text-zinc-100">{p.project}</span> が {p.tool} を実行しようとしています
        </div>
        <code className="block truncate rounded-lg bg-zinc-900 px-3 py-2 font-mono text-[12px] text-zinc-200">{p.summary}</code>
        <div className="mt-auto flex justify-end gap-2">
          {/* 危険な操作もありうるので、目立つのは「拒否」側にしない。キーボードの既定は拒否 */}
          <IslandButton autoFocus onClick={() => api.decidePermission(p.id, "deny")}>拒否</IslandButton>
          <IslandButton variant="warn" onClick={() => api.decidePermission(p.id, "allow")}>許可する</IslandButton>
        </div>
      </div>
    </Frame>
  );
}

export function claudeView(sessions: ClaudeSession[], pending: PermissionRequest[]): View | undefined {
  const p = pending[0];
  if (p) {
    return {
      key: `claude-perm-${p.id}`,
      compact: { left: <PulseDot color="var(--color-live)" />, right: <span className="text-xs font-semibold text-live">許可待ち</span> },
      expanded: { width: 460, height: getGeometry().height + 130, node: <PermissionPanel p={p} /> },
    };
  }
  const s = sessions.find((x) => x.status !== "done");
  if (!s) return undefined;
  return {
    key: "claude",
    compact: {
      left: <Spinner size={15} color="#D97757" />,
      right: <span className="font-mono text-xs text-zinc-200 tabular-nums">{doneCount(s)}/{s.steps.length || "…"}</span>,
    },
    expanded: { width: 460, height: getGeometry().height + 150, node: <SessionPanel s={s} /> },
  };
}

/** 終わった直後の一瞬だけ出す表示 */
export function claudeDoneView(sessions: ClaudeSession[]): View {
  const s = sessions.find((x) => x.status === "done");
  return {
    key: "claude-done",
    compact: {
      left: <AnimatedCheck size={18} />,
      right: <span className="text-xs text-zinc-100">完了 {s && <span className="font-mono text-zinc-400"><Elapsed s={s} /></span>}</span>,
      side: 92,
    },
    expanded: s ? { width: 460, height: getGeometry().height + 150, node: <SessionPanel s={s} /> } : undefined,
  };
}
