import { AnimatePresence, motion } from "motion/react";
import { api, getGeometry } from "@/lib/store";
import { fileSize } from "@/lib/utils";
import { Frame } from "@/ui/frame";
import { Share, Tray, X } from "@/ui/icons";
import type { ShelfFile } from "../../shared/types";
import type { View } from "./types";

const EXT_COLORS: Record<string, string> = { pdf: "#c2410c", fig: "#7c3aed", png: "#0891b2", jpg: "#0891b2", jpeg: "#0891b2", zip: "#a16207", mov: "#be123c", mp4: "#be123c" };

export function FileIcon({ f, size = 34 }: { f: ShelfFile; size?: number }) {
  if (f.icon) return <img src={f.icon} alt="" draggable={false} style={{ width: size, height: size }} className="shrink-0" />;
  return (
    <span className="grid shrink-0 place-items-center rounded-md font-mono text-[9px] font-bold text-white uppercase" style={{ width: size * 0.8, height: size, background: EXT_COLORS[f.ext] ?? "#3f3f46" }}>
      {f.ext.slice(0, 4) || "file"}
    </span>
  );
}

function ShelfPanel({ files }: { files: ShelfFile[] }) {
  return (
    <Frame left={<><Tray size={13} />シェルフ</>} right={<span>{files.length} ファイル</span>}>
      {files.length === 0 ? (
        <div className="grid h-full place-items-center rounded-2xl border-2 border-dashed border-zinc-700 text-sm text-zinc-500">ファイルをノッチにドラッグすると、ここに置いておけます</div>
      ) : (
        <motion.div layout className="flex h-full gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence initial={false}>
            {files.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, scale: 0.6, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                draggable
                onDragStart={(e) => {
                  e.preventDefault();
                  api.shelfStartDrag(f.id);
                }}
                onDoubleClick={() => api.shelfOpen(f.id)}
                className="group relative flex w-[92px] shrink-0 cursor-grab flex-col items-center gap-1.5 rounded-xl bg-zinc-900 p-2.5 active:cursor-grabbing"
                title={`${f.path}\nダブルクリックで開く・ドラッグで他のアプリへ`}
              >
                <FileIcon f={f} />
                <span className="w-full truncate text-center text-[11px] text-zinc-200">{f.name}</span>
                <span className="text-[10px] text-zinc-500">{fileSize(f.size)}</span>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button aria-label="共有（AirDrop など）" className="rounded-full bg-zinc-800 p-1 text-zinc-300 hover:text-white" onClick={() => api.shelfShare(f.id)}><Share size={11} /></button>
                  <button aria-label="シェルフから外す" className="rounded-full bg-zinc-800 p-1 text-zinc-300 hover:text-white" onClick={() => api.shelfRemove(f.id)}><X size={11} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Frame>
  );
}

export function shelfView(files: ShelfFile[]): View {
  return {
    key: "shelf",
    compact: files.length
      ? { left: <FileIcon f={files[0]} size={20} />, right: <span className="font-mono text-xs text-zinc-100">{files.length}</span> }
      : undefined,
    expanded: { width: 460, height: getGeometry().height + 120, node: <ShelfPanel files={files} /> },
  };
}

/** ファイルをドラッグ中に出すドロップ先 */
export function dropView(): View {
  return {
    key: "shelf-drop",
    expanded: {
      width: 420,
      height: getGeometry().height + 96,
      node: (
        <Frame left={<><Tray size={13} />シェルフ</>}>
          <motion.div
            className="grid h-full place-items-center rounded-2xl border-2 border-dashed border-live/70 bg-live/5 text-sm font-semibold text-live"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            ここにドロップ
          </motion.div>
        </Frame>
      ),
    },
  };
}
