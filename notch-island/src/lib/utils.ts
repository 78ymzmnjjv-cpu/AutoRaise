import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn / 21st.dev のコンポーネントがそのまま使えるように同じ名前で用意 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mmss(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function relMinutes(ms: number) {
  const m = Math.round(ms / 60_000);
  if (m <= 0) return "まもなく";
  if (m < 60) return `${m}分後`;
  return `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ""}後`;
}

export function clock(ms: number) {
  return new Date(ms).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** 文字列から決まった色を作る（ジャケットやアバターが無いときの代わり） */
export function hueFrom(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
