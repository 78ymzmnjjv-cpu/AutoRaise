import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NotchConfig } from "../shared/types";

export const DATA_DIR = path.join(os.homedir(), ".notch-island");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

const DEFAULTS: NotchConfig = {
  notchWidth: null,
  shortcuts: { ai: "Alt+Space", timer: "Alt+Shift+T", record: "Alt+Shift+R" },
  calendar: { icsUrls: [], refreshMinutes: 5 },
  ai: { model: "claude-opus-5-5", effort: "low" },
  permissionTimeoutSec: 110,
  recorder: { saveDir: path.join(os.homedir(), "Desktop"), captureAudio: false, showMicIndicator: true },
  server: { port: 47811 },
  focus: { workMin: 25, breakMin: 5, sets: 4 },
};

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? merge(b, v) : v;
  }
  return out as T;
}

export function loadConfig(): NotchConfig {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    // 初回は API キーを除いた既定値を書き出して、編集できるようにする
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULTS, null, 2));
    return DEFAULTS;
  }
  try {
    const cfg = merge(DEFAULTS, JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")));
    cfg.recorder.saveDir = cfg.recorder.saveDir.replace(/^~(?=$|\/)/, os.homedir());
    return cfg;
  } catch (e) {
    console.error("config.json を読めませんでした。既定値で起動します:", e);
    return DEFAULTS;
  }
}
