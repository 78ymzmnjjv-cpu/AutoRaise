#!/usr/bin/env node
// Claude Code の hook から呼ばれ、Notch Island に進捗を送る。
// Notch Island が起動していないときは何もせずに終了し、Claude Code の動作を邪魔しない。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DATA_DIR = path.join(os.homedir(), ".notch-island");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const input = JSON.parse((await readStdin()) || "{}");
const port = readJson(path.join(DATA_DIR, "config.json"), {}).server?.port ?? 47811;
let token = "";
try {
  token = fs.readFileSync(path.join(DATA_DIR, "token"), "utf8").trim();
} catch {
  process.exit(0); // アプリが一度も起動していない
}

const isPermission = input.hook_event_name === "PermissionRequest";
const url = `http://127.0.0.1:${port}${isPermission ? "/claude/permission" : "/claude/event"}`;

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-notch-token": token },
    body: JSON.stringify(input),
    // 許可待ちは人の操作を待つ。それ以外は 1 秒で諦める
    signal: AbortSignal.timeout(isPermission ? 115_000 : 1000),
  });
  if (isPermission && res.ok) {
    const { decision } = await res.json();
    if (decision === "allow" || decision === "deny") {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PermissionRequest",
            decision: decision === "allow" ? { behavior: "allow" } : { behavior: "deny", message: "Notch Island で拒否されました" },
          },
        }),
      );
    }
    // "ask"（時間切れ）のときは何も出さず、いつものターミナルの確認に任せる
  }
} catch {
  // 未起動・タイムアウトは無視
}
process.exit(0);
