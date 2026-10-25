#!/usr/bin/env node
// ノッチに通知を出す小さなコマンド。
//   node scripts/notify.mjs "タイトル" "本文" [--app Slack] [--color "#E11D48"] [--url https://...] [--reply-url https://...]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const body = { app: flag("app"), color: flag("color"), url: flag("url"), replyUrl: flag("reply-url") };
[body.title, body.body] = args;

const dir = path.join(os.homedir(), ".notch-island");
const token = fs.readFileSync(path.join(dir, "token"), "utf8").trim();
const port = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8")).server?.port ?? 47811;
const res = await fetch(`http://127.0.0.1:${port}/notify`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-notch-token": token },
  body: JSON.stringify(body),
});
console.log(res.ok ? "通知しました" : `失敗しました（${res.status}）`);
