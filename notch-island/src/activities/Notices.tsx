import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import { Frame } from "@/ui/frame";
import { Avatar } from "@/ui/avatar";
import { IslandButton } from "@/ui/button";
import { Bell, X } from "@/ui/icons";
import type { Notice } from "../../shared/types";
import type { View } from "./types";

function ReplyBox({ n, onDone }: { n: Notice; onDone: () => void }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");
  const send = async () => {
    setState("sending");
    const ok = await api.replyNotice(n.id, text);
    if (ok) onDone();
    else setState("failed");
  };
  return (
    <form
      className="mt-1.5 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) send();
      }}
    >
      <input
        autoFocus
        id={`reply-${n.id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => api.setFocusable(true)}
        onBlur={() => api.setFocusable(false)}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        placeholder={`${n.title} に返信`}
        className="h-8 min-w-0 flex-1 rounded-full bg-zinc-900 px-3 text-[12.5px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600"
      />
      <IslandButton type="submit" variant="go" size="sm" disabled={state === "sending" || !text.trim()}>
        {state === "sending" ? "送信中" : "送信"}
      </IslandButton>
      {state === "failed" && <span className="text-[11px] text-rec">送れませんでした</span>}
    </form>
  );
}

function Card({ n, i, total, replying, setReplying }: { n: Notice; i: number; total: number; replying: boolean; setReplying: (id: string | null) => void }) {
  return (
    <motion.li
      layout
      // 重なったカードが、展開時に少しずつ遅れて扇のように広がる
      initial={{ opacity: 0, y: -16 * (i + 1), scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 380, damping: 30, delay: i * 0.04 }}
      style={{ zIndex: total - i }}
      className="group rounded-xl bg-zinc-900 px-3 py-2"
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={n.title || n.app} color={n.color} size={28} />
        <button className="min-w-0 flex-1 text-left" onClick={() => n.url && api.openNoticeUrl(n.id)}>
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[12.5px] font-semibold text-zinc-100">{n.title}</span>
            <span className="shrink-0 text-[10px] text-zinc-500">{n.app}</span>
          </div>
          <div className="truncate text-[12px] text-zinc-400">{n.body}</div>
        </button>
        {n.canReply && !replying && (
          <IslandButton size="sm" onClick={() => setReplying(n.id)}>返信</IslandButton>
        )}
        <button aria-label="閉じる" className="rounded p-0.5 text-zinc-600 hover:text-zinc-200" onClick={() => api.dismissNotice(n.id)}><X size={12} /></button>
      </div>
      {replying && <ReplyBox n={n} onDone={() => setReplying(null)} />}
    </motion.li>
  );
}

function Panel({ notices }: { notices: Notice[] }) {
  const [replying, setReplying] = useState<string | null>(null);
  // 多すぎると読めないので3件まで。残りは件数だけ出す
  const shown = notices.slice(0, 3);
  const rest = notices.length - shown.length;
  return (
    <Frame left={<><Bell size={12} />通知</>} right={<span>{rest > 0 ? `ほか ${rest} 件` : `${notices.length} 件`}</span>} className="px-3">
      {notices.length === 0 ? (
        <div className="grid h-full place-items-center text-sm text-zinc-500">新しい通知はありません</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {shown.map((n, i) => <Card key={n.id} n={n} i={i} total={shown.length} replying={replying === n.id} setReplying={setReplying} />)}
          </AnimatePresence>
        </ul>
      )}
    </Frame>
  );
}

export function noticesView(notices: Notice[]): View {
  return { key: "notices", expanded: { width: 460, height: getGeometry().height + 196, node: <Panel notices={notices} /> } };
}

export function noticeFlashView(notices: Notice[]): View {
  const n = notices[0];
  return {
    key: `notice-flash-${n?.id}`,
    compact: n
      ? {
          left: <Avatar name={n.title || n.app} color={n.color} size={22} />,
          right: <span className="block truncate text-[11px] text-zinc-200">{n.body || n.title}</span>,
          side: 120,
        }
      : undefined,
    expanded: noticesView(notices).expanded,
  };
}
