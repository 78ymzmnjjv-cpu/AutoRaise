import Anthropic from "@anthropic-ai/sdk";
import { store } from "../store";
import type { NotchConfig } from "../../shared/types";

const SYSTEM = `あなたは Mac のノッチに住む小さなアシスタントです。
回答はノッチの小さな枠に表示されるので、日本語で3〜5文、要点から先に答えてください。
見出しや表は使わず、コードが必要なときだけ短く1ブロックで示してください。`;

let client: Anthropic | undefined;
let current: { abort(): void } | undefined;

function getClient(cfg: NotchConfig["ai"]) {
  // API キーは config.json か環境変数 ANTHROPIC_API_KEY（どちらも無ければ SDK の既定の認証情報）
  client ??= new Anthropic(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
  return client;
}

export async function askAi(cfg: NotchConfig["ai"], question: string, context?: string) {
  current?.abort();
  const q = question.trim();
  if (!q) return;
  store.set({ ai: { status: "streaming", question: q, answer: "" } });

  const content = context ? `${q}\n\n<参考: クリップボードの内容>\n${context.slice(0, 8000)}\n</参考>` : q;
  let answer = "";
  let flushTimer: NodeJS.Timeout | undefined;
  const flush = () => {
    flushTimer = undefined;
    store.set((s) => ({ ai: { ...s.ai, answer } }));
  };

  try {
    const stream = getClient(cfg).beta.messages.stream({
      model: cfg.model,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: cfg.effort },
      system: SYSTEM,
      messages: [{ role: "user", content }],
      // 安全分類で断られたときは API 側で代わりのモデルに回す
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as Parameters<Anthropic["beta"]["messages"]["stream"]>[0]);
    current = stream;
    stream.on("text", (delta) => {
      answer += delta;
      // 1文字ごとに IPC を送らず、約16fpsにまとめる
      flushTimer ??= setTimeout(flush, 60);
    });
    const final = await stream.finalMessage();
    if (flushTimer) clearTimeout(flushTimer);
    if (final.stop_reason === "refusal") {
      store.set((s) => ({ ai: { ...s.ai, answer, status: "error", error: "この質問には答えられませんでした。" } }));
    } else {
      store.set((s) => ({ ai: { ...s.ai, answer, status: "done" } }));
    }
  } catch (e) {
    if (flushTimer) clearTimeout(flushTimer);
    if (e instanceof Anthropic.APIUserAbortError) return;
    let msg = "回答を取得できませんでした。";
    if (e instanceof Anthropic.AuthenticationError) msg = "API キーが無効です。~/.notch-island/config.json の ai.apiKey か ANTHROPIC_API_KEY を確認してください。";
    else if (e instanceof Anthropic.RateLimitError) msg = "混み合っています。少し待ってからもう一度試してください。";
    else if (e instanceof Anthropic.APIConnectionError) msg = "ネットワークに接続できません。";
    else if (e instanceof Anthropic.APIError) msg = `API エラー（${e.status}）: ${e.message}`;
    else if (e instanceof Error && /api key|apiKey|authentication/i.test(e.message)) msg = "API キーが設定されていません。README の「AI に質問」を参照してください。";
    store.set((s) => ({ ai: { ...s.ai, answer, status: "error", error: msg } }));
  } finally {
    current = undefined;
  }
}

export function cancelAi() {
  current?.abort();
  store.set((s) => ({ ai: { ...s.ai, status: s.ai.answer ? "done" : "idle" } }));
}

export function resetAi() {
  current?.abort();
  store.set({ ai: { status: "idle", question: "", answer: "" } });
}
