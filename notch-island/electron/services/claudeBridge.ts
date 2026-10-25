import path from "node:path";
import { randomUUID } from "node:crypto";
import { store } from "../store";
import type { ClaudeSession, ClaudeStep, PermissionRequest } from "../../shared/types";

/** Claude Code の hook から届く JSON（使うフィールドだけ） */
export interface HookInput {
  hook_event_name: string;
  session_id: string;
  cwd?: string;
  prompt?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  message?: string;
  notification_type?: string;
}

type Decision = "allow" | "deny" | "ask";
const waiters = new Map<string, (d: Decision) => void>();
const MAX_STEPS = 8;

const short = (s: unknown, n = 48) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

/** ツール呼び出しを「人が読める1行」にする */
export function describeTool(tool = "", input: Record<string, unknown> = {}): string {
  const file = input.file_path ? path.basename(String(input.file_path)) : "";
  switch (tool) {
    case "Bash":
      return short(input.description || input.command);
    case "Edit":
    case "MultiEdit":
      return `${file} を編集`;
    case "Write":
      return `${file} を作成`;
    case "Read":
      return `${file} を読む`;
    case "Grep":
    case "Glob":
      return `検索: ${short(input.pattern, 32)}`;
    case "WebFetch":
    case "WebSearch":
      return `Web: ${short(input.query || input.url, 36)}`;
    case "Task":
    case "Agent":
      return `サブエージェント: ${short(input.description, 30)}`;
    default:
      return short(tool.replace(/^mcp__/, "").replace(/__/g, " "));
  }
}

function upsert(id: string, fn: (s: ClaudeSession) => ClaudeSession, cwd?: string) {
  store.set((st) => {
    const existing = st.claude.sessions.find((s) => s.id === id);
    const base: ClaudeSession = existing ?? {
      id,
      project: cwd ? path.basename(cwd) : "Claude Code",
      prompt: "",
      status: "running",
      steps: [],
      startedAt: Date.now(),
    };
    const updated = fn(base);
    // 終わってから10分経ったセッションは片付ける
    const keep = st.claude.sessions.filter(
      (s) => s.id !== id && !(s.status === "done" && Date.now() - (s.endedAt ?? 0) > 10 * 60_000),
    );
    return { claude: { ...st.claude, sessions: [updated, ...keep].slice(0, 5) } };
  });
}

export function handleHookEvent(e: HookInput) {
  const id = e.session_id || "default";
  switch (e.hook_event_name) {
    case "UserPromptSubmit":
      upsert(id, (s) => ({ ...s, prompt: short(e.prompt, 80), status: "running", steps: [], startedAt: Date.now(), endedAt: undefined }), e.cwd);
      break;
    case "PreToolUse": {
      const step: ClaudeStep = { id: e.tool_use_id ?? randomUUID(), label: describeTool(e.tool_name, e.tool_input), status: "running" };
      upsert(id, (s) => ({ ...s, status: "running", steps: [...s.steps, step].slice(-MAX_STEPS) }), e.cwd);
      break;
    }
    case "PostToolUse":
    case "PostToolUseFailure": {
      const status = e.hook_event_name === "PostToolUse" ? "done" : "error";
      upsert(id, (s) => {
        const idx = e.tool_use_id
          ? s.steps.findIndex((x) => x.id === e.tool_use_id)
          : s.steps.map((x) => x.status).lastIndexOf("running");
        if (idx < 0) return s;
        const steps = s.steps.slice();
        steps[idx] = { ...steps[idx], status };
        return { ...s, status: "running", steps };
      }, e.cwd);
      break;
    }
    case "Notification":
      if (e.notification_type === "permission_prompt" || e.notification_type === "idle_prompt" || e.notification_type === "agent_needs_input") upsert(id, (s) => ({ ...s, status: "waiting" }), e.cwd);
      break;
    case "Stop":
      upsert(id, (s) => ({
        ...s,
        status: "done",
        endedAt: Date.now(),
        steps: s.steps.map((x) => (x.status === "running" ? { ...x, status: "done" as const } : x)),
      }), e.cwd);
      store.flash("claude-done");
      break;
    case "SessionEnd":
      store.set((st) => ({ claude: { ...st.claude, sessions: st.claude.sessions.filter((s) => s.id !== id) } }));
      break;
  }
}

/** PermissionRequest hook。島でボタンが押されるかタイムアウトするまで待つ */
export function requestPermission(e: HookInput, timeoutSec: number): { id: string; result: Promise<Decision> } {
  const req: PermissionRequest = {
    id: randomUUID(),
    sessionId: e.session_id,
    project: e.cwd ? path.basename(e.cwd) : "Claude Code",
    tool: e.tool_name ?? "",
    summary: describeTool(e.tool_name, e.tool_input),
    requestedAt: Date.now(),
    expiresAt: Date.now() + timeoutSec * 1000,
  };
  const detail = e.tool_name === "Bash" ? short(e.tool_input?.command, 120) : req.summary;
  req.summary = detail;
  store.set((st) => ({ claude: { ...st.claude, pending: [...st.claude.pending, req] } }));
  upsert(e.session_id, (s) => ({ ...s, status: "waiting" }), e.cwd);

  const result = new Promise<Decision>((resolve) => {
    const done = (d: Decision) => {
      clearTimeout(timer);
      waiters.delete(req.id);
      store.set((st) => ({ claude: { ...st.claude, pending: st.claude.pending.filter((p) => p.id !== req.id) } }));
      if (d !== "deny") upsert(e.session_id, (s) => ({ ...s, status: "running" }));
      resolve(d);
    };
    // 時間切れなら "ask" を返し、いつものターミナルの確認に戻す
    const timer = setTimeout(() => done("ask"), timeoutSec * 1000);
    waiters.set(req.id, done);
  });
  return { id: req.id, result };
}

/** 島のボタン、または hook 側の切断（ターミナルで先に答えた等）で呼ばれる */
export function decidePermission(id: string, decision: Decision) {
  waiters.get(id)?.(decision);
}
