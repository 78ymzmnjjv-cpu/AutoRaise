import { powerMonitor } from "electron";
import { run } from "../exec";
import { store } from "../store";
import type { AirPodsState, PowerState } from "../../shared/types";

async function readBattery(): Promise<Omit<PowerState, "airpods"> | undefined> {
  const out = await run("pmset", ["-g", "batt"]).catch(() => "");
  const pct = out.match(/(\d+)%/);
  if (!pct) return undefined; // デスクトップ Mac にはバッテリーがない
  const pluggedIn = /AC Power/.test(out);
  return { percent: Number(pct[1]), pluggedIn, charging: pluggedIn && /;\s*charging/.test(out) };
}

async function updateBattery() {
  const b = await readBattery();
  if (!b) return;
  const prev = store.state.power;
  store.set({ power: { ...prev, ...b } });
  if (prev && !prev.pluggedIn && b.pluggedIn) store.flash("power");
}

const pct = (v: unknown) => (typeof v === "string" && /\d/.test(v) ? Number(v.replace(/\D/g, "")) : undefined);

interface BtDevice {
  device_batteryLevelLeft?: string;
  device_batteryLevelRight?: string;
  device_batteryLevelCase?: string;
  device_batteryLevelMain?: string;
}

/** 接続中のイヤホンのうち、左右の残量が取れる最初の1台 */
async function readAirPods(): Promise<AirPodsState | undefined> {
  const out = await run("system_profiler", ["SPBluetoothDataType", "-json"], 15000).catch(() => "");
  if (!out) return undefined;
  try {
    const root = JSON.parse(out).SPBluetoothDataType?.[0] ?? {};
    const connected: Record<string, BtDevice>[] = root.device_connected ?? [];
    for (const entry of connected) {
      for (const [name, d] of Object.entries(entry)) {
        const left = pct(d.device_batteryLevelLeft);
        const right = pct(d.device_batteryLevelRight);
        if (left != null || right != null) return { name, left, right, case: pct(d.device_batteryLevelCase) };
      }
    }
  } catch {
    /* 形式が変わっていたら諦める */
  }
  return undefined;
}

async function updateAirPods() {
  const ap = await readAirPods();
  const prev = store.state.power?.airpods;
  store.set((s) => ({ power: { percent: 0, charging: false, pluggedIn: false, ...s.power, airpods: ap } }));
  if (ap && !prev) store.flash("airpods");
}

export function startPower() {
  updateBattery();
  updateAirPods();
  setInterval(updateBattery, 20_000);
  setInterval(updateAirPods, 12_000);
  // 電源の抜き差しは即時に反映
  powerMonitor.on("on-ac", () => setTimeout(updateBattery, 400));
  powerMonitor.on("on-battery", () => setTimeout(updateBattery, 400));
}
