import { getGeometry } from "@/lib/store";
import { cn } from "@/lib/utils";

/** 展開時の枠。最上段はカメラの左右だけを使い、本文はノッチの下から始める */
export function Frame({ left, right, children, className }: { left?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const g = getGeometry();
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-5 text-[11px] text-zinc-400" style={{ height: g.height }}>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap" style={{ maxWidth: `calc(50% - ${g.width / 2 + 8}px)` }}>{left}</div>
        <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-hidden whitespace-nowrap" style={{ maxWidth: `calc(50% - ${g.width / 2 + 8}px)` }}>{right}</div>
      </div>
      <div className={cn("min-h-0 flex-1 px-5 pb-4", className)}>{children}</div>
    </div>
  );
}
