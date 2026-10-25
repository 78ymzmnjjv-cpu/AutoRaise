#!/usr/bin/env node
// ~/.claude/settings.json に Notch Island の hook を追加する（既存の設定は残し、バックアップを作る）
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hook = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "notch-hook.mjs");
const command = `node "${hook}"`;
const settingsPath = path.join(os.homedir(), ".claude", "settings.json");

const EVENTS = {
  UserPromptSubmit: {},
  PreToolUse: { matcher: "*" },
  PostToolUse: { matcher: "*" },
  PostToolUseFailure: { matcher: "*" },
  Notification: {},
  Stop: {},
  SessionEnd: {},
  // 島のボタンを待つので、アプリ側の待ち時間（既定 110 秒）より長くする
  PermissionRequest: { matcher: "*", timeout: 120 },
};

let settings = {};
if (fs.existsSync(settingsPath)) {
  const raw = fs.readFileSync(settingsPath, "utf8");
  settings = JSON.parse(raw);
  fs.writeFileSync(`${settingsPath}.bak-${Date.now()}`, raw);
}
settings.hooks ??= {};

let added = 0;
for (const [event, opts] of Object.entries(EVENTS)) {
  const groups = (settings.hooks[event] ??= []);
  const exists = groups.some((g) => g.hooks?.some((h) => h.command?.includes("notch-hook.mjs")));
  if (exists) continue;
  const entry = { type: "command", command };
  if (opts.timeout) entry.timeout = opts.timeout;
  groups.push(opts.matcher ? { matcher: opts.matcher, hooks: [entry] } : { hooks: [entry] });
  added++;
}

fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
console.log(added ? `${settingsPath} に ${added} 件の hook を追加しました。` : "hook はすでに設定済みです。");
console.log("Claude Code を開き直すと有効になります。");
