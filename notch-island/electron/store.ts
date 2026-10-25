import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { NotchState, TransientKind } from "../shared/types";

const TRANSIENT_MS: Record<TransientKind, number> = {
  clipboard: 2200,
  power: 3000,
  airpods: 4000,
  notice: 6000,
  "claude-done": 4500,
  "record-saved": 4500,
};

/** メインプロセス側の唯一の状態。変更はすべて set() 経由でレンダラーに届く */
class Store extends EventEmitter {
  state: NotchState = {
    claude: { sessions: [], pending: [] },
    record: { active: false, micInUse: false },
    clipboard: [],
    notices: [],
    shelf: [],
    ai: { status: "idle", question: "", answer: "" },
    aiOpenSeq: 0,
  };
  private pending = false;

  set(patch: Partial<NotchState> | ((s: NotchState) => Partial<NotchState>)) {
    const p = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    // 同じティック内の複数更新は1回の送信にまとめる
    if (!this.pending) {
      this.pending = true;
      queueMicrotask(() => {
        this.pending = false;
        this.emit("change", this.state);
      });
    }
  }

  flash(kind: TransientKind) {
    this.set({ transient: { id: randomUUID(), kind, until: Date.now() + TRANSIENT_MS[kind] } });
  }
}

export const store = new Store();
