#!/usr/bin/env node
// Mac 上でアプリを実際に起動し、島の各状態をキャプチャして確かめる（GitHub Actions 用）。
//   npm run build && node scripts/smoke.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "smoke-out");
const dataDir = path.join(os.homedir(), ".notch-island");
const tokenPath = path.join(dataDir, "token");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(tokenPath, { force: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures.push(label);
};

let log = "";
const app = spawn(path.join(root, "node_modules", ".bin", "electron"), ["."], {
  cwd: root,
  env: { ...process.env, NOTCH_SMOKE: "1", NOTCH_SMOKE_DIR: outDir },
});
app.stdout.on("data", (d) => (log += d));
app.stderr.on("data", (d) => (log += d));

async function waitFor(fn, label, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(300);
  }
  check(false, label);
  return false;
}

let token = "";
const call = async (route, body = {}) => {
  const res = await fetch(`http://127.0.0.1:47811${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-notch-token": token },
    body: JSON.stringify(body),
  });
  return res.json();
};
const shot = async (name, waitMs = 900) => {
  await sleep(waitMs);
  await call("/smoke/shot", { name });
};
const hook = (input) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(root, "hooks", "notch-hook.mjs")]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("exit", (code) => resolve({ code, out }));
    p.stdin.end(JSON.stringify(input));
  });

try {
  await waitFor(() => log.includes("SMOKE:renderer-loaded") && fs.existsSync(tokenPath), "アプリが起動して画面を読み込む");
  token = fs.readFileSync(tokenPath, "utf8").trim();
  await sleep(1500);

  const noAuth = await fetch("http://127.0.0.1:47811/notify", { method: "POST", body: "{}" });
  check(noAuth.status === 401, "トークンなしのリクエストを拒否する");

  await shot("00-idle");
  await call("/smoke/hover", { on: true });
  await shot("01-home");
  await call("/smoke/hover", { on: false });

  // Claude Code の hook を本物のスクリプト経由で流す
  const base = { session_id: "smoke", cwd: "/Users/me/autoraise" };
  await hook({ ...base, hook_event_name: "UserPromptSubmit", prompt: "ノッチ島を実装して" });
  await hook({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "npm test", description: "テストを実行" }, tool_use_id: "t1" });
  await hook({ ...base, hook_event_name: "PostToolUse", tool_name: "Bash", tool_use_id: "t1" });
  await hook({ ...base, hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "/x/AutoRaise.mm" }, tool_use_id: "t2" });
  const st = await call("/smoke/state");
  check(st.claude.sessions[0]?.steps.length === 2, "hook の進捗が状態に入る");
  await shot("02-claude-compact");
  await call("/smoke/hover", { on: true });
  await shot("03-claude-expanded");
  await call("/smoke/hover", { on: false });

  // 許可待ち → 島で「許可」→ hook が allow を返す
  const pending = hook({ ...base, hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: { command: "git push origin feature/notch" } });
  await waitFor(async () => (await call("/smoke/state")).claude.pending.length === 1, "許可待ちが島に出る", 10_000);
  await shot("04-permission");
  await call("/smoke/decide", { decision: "allow" });
  const decided = await pending;
  check(decided.code === 0 && JSON.parse(decided.out || "{}").hookSpecificOutput?.decision?.behavior === "allow", "島で許可すると hook が allow を返す");

  await hook({ ...base, hook_event_name: "Stop" });
  await shot("05-claude-done", 700);

  await call("/notify", { app: "LINE", title: "まお", body: "今日の撮影、18時からでOK？", color: "#22C55E", replyUrl: "https://example.com/reply" });
  await shot("06-notice", 700);
  await call("/smoke/hover", { on: true });
  await shot("07-notices-expanded");
  await call("/smoke/hover", { on: false });
  await sleep(6500); // 通知の一時表示が消えるまで待つ

  // 画面全体：メニューバーとノッチに対する位置を確認する
  await new Promise((r) => spawn("screencapture", ["-x", path.join(outDir, "99-screen.png")]).on("exit", r));

  const errors = log.split("\n").filter((l) => l.includes("SMOKE:renderer-error"));
  check(errors.length === 0, `画面側でエラーが出ない${errors.length ? `\n  ${errors.join("\n  ")}` : ""}`);
  check(app.exitCode === null, "アプリが落ちずに動き続ける");
} catch (e) {
  check(false, `例外: ${e.stack ?? e}`);
} finally {
  app.kill();
  fs.writeFileSync(path.join(outDir, "app.log"), log);
}

console.log(failures.length ? `\n${failures.length} 件失敗しました` : "\nすべて成功しました");
process.exit(failures.length ? 1 : 0);
