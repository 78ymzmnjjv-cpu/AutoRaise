import { AnimatePresence, motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import { Frame } from "@/ui/frame";
import { Clip, X } from "@/ui/icons";
import type { ClipItem } from "../../shared/types";
import type { View } from "./types";

const LABEL: Record<ClipItem["kind"], string> = { url: "URL", color: "色", code: "コード", text: "テキスト" };

function preview(c: ClipItem) {
  const one = c.text.replace(/\s+/g, " ").trim();
  return c.kind === "url" ? one.replace(/^https?:\/\/(www\.)?/, "") : one;
}

function Row({ c }: { c: ClipItem }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-zinc-800/80"
    >
      <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => api.pasteClip(c.id)} title="クリックで前面のアプリに貼り付け">
        {c.kind === "color" ? (
          <span className="size-4 shrink-0 rounded border border-white/10" style={{ background: c.text.trim() }} />
        ) : (
          <span className="w-12 shrink-0 text-[10px] text-zinc-500">{LABEL[c.kind]}</span>
        )}
        <span className={`truncate text-[12.5px] text-zinc-100 ${c.kind === "code" || c.kind === "color" ? "font-mono" : ""}`}>{preview(c)}</span>
      </button>
      <button aria-label="履歴から消す" className="rounded p-0.5 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-zinc-200" onClick={() => api.removeClip(c.id)}>
        <X size={12} />
      </button>
    </motion.li>
  );
}

function Panel({ items }: { items: ClipItem[] }) {
  return (
    <Frame left={<><Clip size={12} />クリップボード</>} right={<span>{items.length} 件</span>} className="px-3">
      {items.length === 0 ? (
        <div className="grid h-full place-items-center text-sm text-zinc-500">コピーしたものがここに並びます</div>
      ) : (
        <ul className="flex h-full flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence initial={false}>{items.slice(0, 8).map((c) => <Row key={c.id} c={c} />)}</AnimatePresence>
        </ul>
      )}
    </Frame>
  );
}

export function clipboardView(items: ClipItem[]): View {
  return { key: "clipboard", expanded: { width: 440, height: getGeometry().height + 176, node: <Panel items={items} /> } };
}

/** コピーした瞬間の確認表示。少しだけ跳ねる */
export function clipboardFlashView(items: ClipItem[]): View {
  const c = items[0];
  return {
    key: `clip-flash-${c?.id}`,
    compact: {
      left: (
        <motion.span initial={{ y: -8 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="text-xs font-semibold text-zinc-100">
          コピー
        </motion.span>
      ),
      right: <span className="block max-w-full truncate text-[11px] text-zinc-400">{c ? preview(c) : ""}</span>,
      side: 112,
    },
    expanded: { width: 440, height: getGeometry().height + 176, node: <Panel items={items} /> },
  };
}
