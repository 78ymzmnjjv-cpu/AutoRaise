import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { DATA_DIR } from "./config";
import { decidePermission, handleHookEvent, requestPermission, type HookInput } from "./services/claudeBridge";
import { pushNotice } from "./services/notices";
import type { NotchConfig } from "../shared/types";

export const TOKEN_PATH = path.join(DATA_DIR, "token");

/** 起動ごとにトークンを作り、本人だけが読めるファイルに置く。
 *  ブラウザ上のページから localhost に POST されるのを防ぐため、全リクエストでヘッダーを確認する */
function issueToken(): string {
  const token = randomBytes(24).toString("hex");
  fs.writeFileSync(TOKEN_PATH, token, { mode: 0o600 });
  return token;
}

function readBody(req: http.IncomingMessage, limit = 256 * 1024): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function send(res: http.ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function startServer(cfg: NotchConfig) {
  const token = Buffer.from(issueToken());

  const server = http.createServer(async (req, res) => {
    const given = Buffer.from(String(req.headers["x-notch-token"] ?? ""));
    if (given.length !== token.length || !timingSafeEqual(given, token)) return send(res, 401, { error: "unauthorized" });
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });

    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      return send(res, 400, { error: "invalid json" });
    }

    switch (req.url) {
      case "/claude/event":
        handleHookEvent(body as HookInput);
        return send(res, 200, { ok: true });
      case "/claude/permission": {
        const { id, result } = requestPermission(body as HookInput, cfg.permissionTimeoutSec);
        // hook が先に終了した（ターミナル側で答えた等）なら島の表示も下げる
        res.on("close", () => decidePermission(id, "ask"));
        return send(res, 200, { decision: await result });
      }
      case "/notify":
        return send(res, 200, { id: pushNotice(body as Record<string, string>).id });
      default:
        return send(res, 404, { error: "not found" });
    }
  });

  server.on("error", (e) => console.error(`ポート ${cfg.server.port} で待ち受けできませんでした:`, e));
  server.listen(cfg.server.port, "127.0.0.1");
  // permission は人の操作を待つので、Node 既定のタイムアウトで切らない
  server.requestTimeout = 0;
  server.headersTimeout = 10_000;
  return server;
}
