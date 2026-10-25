// 自動テスト用（NOTCH_SMOKE=1 で起動したときだけ使う）。
// GitHub Actions の Mac で、島の表示をキャプチャしたり、ホバーや許可ボタンを再現したりする
import fs from "node:fs";
import path from "node:path";
import type { BrowserWindow } from "electron";
import { decidePermission } from "./services/claudeBridge";
import { store } from "./store";
import type { ExtraRoutes } from "./server";

export function smokeRoutes(win: BrowserWindow, setHover: (h: boolean) => void): ExtraRoutes {
  const outDir = process.env.NOTCH_SMOKE_DIR ?? path.join(process.cwd(), "smoke-out");
  fs.mkdirSync(outDir, { recursive: true });

  win.webContents.on("did-finish-load", () => console.log("SMOKE:renderer-loaded"));
  win.webContents.on("console-message", (e) => {
    if (e.level === "error") console.log(`SMOKE:renderer-error ${e.message}`);
  });
  win.webContents.on("render-process-gone", (_e, d) => console.log(`SMOKE:renderer-error gone ${d.reason}`));

  return {
    "/smoke/shot": async (body) => {
      const name = String((body as { name?: string }).name ?? "shot").replace(/[^\w-]/g, "");
      const img = await win.webContents.capturePage();
      const file = path.join(outDir, `${name}.png`);
      fs.writeFileSync(file, img.toPNG());
      return { file, bounds: win.getBounds() };
    },
    "/smoke/hover": (body) => setHover(!!(body as { on?: boolean }).on),
    "/smoke/decide": (body) => {
      const first = store.state.claude.pending[0];
      if (first) decidePermission(first.id, (body as { decision?: "allow" | "deny" }).decision ?? "allow");
      return { decided: first?.id ?? null };
    },
    "/smoke/state": () => store.state,
  };
}
