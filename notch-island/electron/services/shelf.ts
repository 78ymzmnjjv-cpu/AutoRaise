import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { app, nativeImage, shell, ShareMenu, type BrowserWindow, type NativeImage, type WebContents } from "electron";
import { DATA_DIR } from "../config";
import { store } from "../store";
import type { ShelfFile } from "../../shared/types";

const SHELF_PATH = path.join(DATA_DIR, "shelf.json");
const icons = new Map<string, NativeImage>();

function save() {
  const files = store.state.shelf.map(({ icon: _icon, ...f }) => f);
  fs.writeFileSync(SHELF_PATH, JSON.stringify(files, null, 2));
}

async function withIcon(f: ShelfFile): Promise<ShelfFile> {
  try {
    const img = await app.getFileIcon(f.path, { size: "normal" });
    icons.set(f.id, img);
    return { ...f, icon: img.toDataURL() };
  } catch {
    return f;
  }
}

export async function loadShelf() {
  try {
    const saved: ShelfFile[] = JSON.parse(fs.readFileSync(SHELF_PATH, "utf8"));
    const alive = saved.filter((f) => fs.existsSync(f.path));
    store.set({ shelf: await Promise.all(alive.map(withIcon)) });
  } catch {
    /* 初回はファイルがない */
  }
}

export async function addToShelf(paths: string[]) {
  const existing = new Set(store.state.shelf.map((f) => f.path));
  const added: ShelfFile[] = [];
  for (const p of paths) {
    if (!p || existing.has(p) || !fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    added.push(await withIcon({ id: randomUUID(), path: p, name: path.basename(p), ext: path.extname(p).slice(1).toLowerCase(), size: st.size }));
  }
  if (!added.length) return;
  store.set((s) => ({ shelf: [...added, ...s.shelf].slice(0, 30) }));
  save();
}

export function removeFromShelf(id: string) {
  icons.delete(id);
  store.set((s) => ({ shelf: s.shelf.filter((f) => f.id !== id) }));
  save();
}

const find = (id: string) => store.state.shelf.find((f) => f.id === id);

export function openShelfFile(id: string) {
  const f = find(id);
  if (f) shell.openPath(f.path);
}

/** macOS の共有メニュー（AirDrop・メッセージ・メールなど）を島の下に出す */
export function shareShelfFile(id: string, win: BrowserWindow) {
  const f = find(id);
  if (f) new ShareMenu({ filePaths: [f.path] }).popup({ window: win });
}

/** 島から別アプリへファイルをドラッグして渡す */
export function startShelfDrag(id: string, sender: WebContents) {
  const f = find(id);
  if (!f) return;
  const icon = icons.get(id) ?? nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAS0lEQVR42u3XMQoAIAwEwTw7pT/XSpCghYgXhV24ftozezH3Um9sC3BSOmCFkAJmCDkgIlIAIyIN0BEAAAAAAAAAAAAAAAD455wqa4mek+EVaBpqAAAAAElFTkSuQmCC",
  );
  sender.startDrag({ file: f.path, icon });
}
