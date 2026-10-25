import { useSyncExternalStore } from "react";
import { getConfig } from "./store";

export interface TimerState {
  phase: "idle" | "work" | "break";
  /** 実行中は終了時刻、一時停止中は残りミリ秒 */
  endsAt: number;
  remainingMs: number;
  paused: boolean;
  set: number;
  totalMs: number;
  /** フェーズが切り替わった時刻。島を一瞬光らせるのに使う */
  flashedAt: number;
}

let t: TimerState = { phase: "idle", endsAt: 0, remainingMs: 0, paused: false, set: 1, totalMs: 0, flashedAt: 0 };
const ls = new Set<() => void>();
const set = (p: Partial<TimerState>) => {
  t = { ...t, ...p };
  ls.forEach((l) => l());
};

function begin(phase: "work" | "break", setNo: number) {
  const f = getConfig().focus;
  const totalMs = (phase === "work" ? f.workMin : f.breakMin) * 60_000;
  set({ phase, set: setNo, totalMs, endsAt: Date.now() + totalMs, remainingMs: totalMs, paused: false, flashedAt: Date.now() });
}

export const timer = {
  start: () => begin("work", 1),
  toggle: () => (t.phase === "idle" ? begin("work", 1) : t.paused ? timer.resume() : timer.pause()),
  pause: () => set({ paused: true, remainingMs: Math.max(0, t.endsAt - Date.now()) }),
  resume: () => set({ paused: false, endsAt: Date.now() + t.remainingMs }),
  skip: () => advance(),
  stop: () => set({ phase: "idle", paused: false }),
};

function advance() {
  const sets = getConfig().focus.sets;
  if (t.phase === "work") begin("break", t.set);
  else if (t.set < sets) begin("work", t.set + 1);
  else set({ phase: "idle", flashedAt: Date.now() });
}

setInterval(() => {
  if (t.phase !== "idle" && !t.paused && Date.now() >= t.endsAt) advance();
}, 500);

export const useTimer = () =>
  useSyncExternalStore(
    (l) => {
      ls.add(l);
      return () => ls.delete(l);
    },
    () => t,
  );

export const remainingOf = (s: TimerState, now: number) => (s.paused ? s.remainingMs : Math.max(0, s.endsAt - now));
