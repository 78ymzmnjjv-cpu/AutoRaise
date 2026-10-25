import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import { Frame } from "@/ui/frame";
import { IslandButton } from "@/ui/button";
import { ShimmerText } from "@/ui/status";
import type { AiState, ClipItem } from "../../shared/types";
import type { View } from "./types";

const Mark = () => <span className="font-bold text-[#D97757]">✳</span>;

function AiPanel({ ai, clip, onClose }: { ai: AiState; clip?: ClipItem; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [useClip, setUseClip] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hasAnswer = ai.status !== "idle";

  useEffect(() => {
    api.setFocusable(true);
    input.current?.focus();
    return () => api.setFocusable(false);
  }, []);

  const submit = () => {
    if (!q.trim()) return;
    api.askAi(q, useClip ? clip?.text : undefined);
    setQ("");
  };

  return (
    <div
      className="h-full"
      onKeyDown={(e) => {
        // Esc で必ず閉じられるようにする
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <Frame left={<><Mark />Claude に質問</>} right={<span className="font-mono">esc で閉じる</span>}>
        <div className="flex h-full flex-col gap-2.5">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              ref={input}
              id="ai-question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={hasAnswer ? "続けて質問" : "何でも聞いてください"}
              className="h-9 min-w-0 flex-1 rounded-full bg-zinc-900 px-4 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-700"
            />
            {clip && (
              <button
                type="button"
                onClick={() => setUseClip((v) => !v)}
                className={`h-9 shrink-0 rounded-full px-3 text-[11px] transition-colors ${useClip ? "bg-live/20 text-live" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}
                title={clip.text.slice(0, 200)}
              >
                {useClip ? "クリップボード添付中" : "クリップボードを添付"}
              </button>
            )}
          </form>
          {hasAnswer && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="truncate text-[11px] text-zinc-500">{ai.question}</div>
              <div className="min-h-0 flex-1 overflow-y-auto text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-100 select-text" style={{ scrollbarWidth: "thin" }}>
                {ai.answer || (ai.status === "streaming" && <ShimmerText>考えています…</ShimmerText>)}
                {ai.status === "error" && <div className="mt-1 text-red-400">{ai.error}</div>}
              </div>
              <div className="flex justify-end gap-2">
                {ai.status === "streaming" ? (
                  <IslandButton size="sm" onClick={api.cancelAi}>止める</IslandButton>
                ) : (
                  <>
                    <IslandButton size="sm" variant="ghost" onClick={api.resetAi}>クリア</IslandButton>
                    <IslandButton size="sm" onClick={() => navigator.clipboard.writeText(ai.answer).catch(() => undefined)} disabled={!ai.answer}>
                      コピー
                    </IslandButton>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </Frame>
    </div>
  );
}

export function aiView(ai: AiState, clip: ClipItem | undefined, onClose: () => void): View {
  const hasAnswer = ai.status !== "idle";
  return {
    key: "ai",
    expanded: { width: 540, height: getGeometry().height + (hasAnswer ? 210 : 62), node: <AiPanel ai={ai} clip={clip} onClose={onClose} /> },
  };
}
