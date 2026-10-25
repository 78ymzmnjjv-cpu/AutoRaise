import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app, shell } from "electron";
import { run } from "../exec";
import { store } from "../store";
import type { NotchConfig } from "../../shared/types";

let proc: ChildProcess | undefined;
let file = "";

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

/** macOS 標準の screencapture -v で画面全体を収録する（画面収録の権限が必要） */
export function startRecording(cfg: NotchConfig["recorder"]) {
  if (proc) return;
  fs.mkdirSync(cfg.saveDir, { recursive: true });
  file = path.join(cfg.saveDir, `Notch 収録 ${stamp()}.mov`);
  const args = ["-v", "-C", "-k"];
  if (cfg.captureAudio) args.push("-g");
  args.push(file);
  proc = spawn("screencapture", args, { stdio: "ignore" });
  store.set((s) => ({ record: { ...s.record, active: true, startedAt: Date.now(), error: undefined } }));
  proc.on("exit", async () => {
    proc = undefined;
    const saved = fs.existsSync(file);
    store.set((s) => ({
      record: { ...s.record, active: false, startedAt: undefined, error: saved ? undefined : "収録を保存できませんでした。画面収録の権限を確認してください。" },
    }));
    if (!saved) return;
    const thumb = await thumbnail(file);
    store.set((s) => ({ record: { ...s.record, lastSaved: { path: file, thumb, savedAt: Date.now() } } }));
    store.flash("record-saved");
  });
}

export function stopRecording() {
  // screencapture は SIGINT（Ctrl-C と同じ）で書き出しを終えて終了する
  proc?.kill("SIGINT");
}

async function thumbnail(movie: string): Promise<string | undefined> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notch-thumb-"));
  try {
    await run("qlmanage", ["-t", "-s", "240", "-o", dir, movie], 10000);
    const png = fs.readdirSync(dir).find((f) => f.endsWith(".png"));
    if (!png) return undefined;
    return "data:image/png;base64," + fs.readFileSync(path.join(dir, png)).toString("base64");
  } catch {
    return undefined;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function revealRecording() {
  const p = store.state.record.lastSaved?.path;
  if (p) shell.showItemInFolder(p);
}

/** マイク使用中の監視。helpers/bin/micstate（Swift製）があれば使う */
export function startMicMonitor() {
  const candidates = [
    path.join(app.getAppPath(), "helpers", "bin", "micstate"),
    path.join(process.resourcesPath ?? "", "app", "helpers", "bin", "micstate"),
  ];
  const bin = candidates.find((p) => fs.existsSync(p));
  if (!bin) {
    console.log("micstate が見つからないため、マイク使用中の表示は無効です（npm run build:helpers で作れます）");
    return;
  }
  const child = spawn(bin, [], { stdio: ["ignore", "pipe", "ignore"] });
  let buf = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    const lastLine = lines.filter(Boolean).pop();
    if (lastLine) store.set((s) => ({ record: { ...s.record, micInUse: lastLine.trim() === "1" } }));
  });
  app.on("will-quit", () => child.kill());
}
