import path from "node:path";
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } from "electron";
import { DATA_DIR, loadConfig } from "./config";
import { startServer } from "./server";
import { store } from "./store";
import { musicCommand, startNowPlaying } from "./services/nowPlaying";
import { decidePermission } from "./services/claudeBridge";
import { startCalendar } from "./services/calendar";
import { pasteClip, removeClip, startClipboard } from "./services/clipboard";
import { startPower } from "./services/power";
import { revealRecording, startMicMonitor, startRecording, stopRecording } from "./services/recorder";
import { addToShelf, loadShelf, openShelfFile, removeFromShelf, shareShelfFile, startShelfDrag } from "./services/shelf";
import { dismissNotice, openNoticeUrl, replyNotice } from "./services/notices";
import { askAi, cancelAi, resetAi } from "./services/ai";
import type { NotchGeometry } from "../shared/types";

const WINDOW_W = 760;
const WINDOW_H = 380;

const config = loadConfig();
let win: BrowserWindow;
let tray: Tray;
let geometry: NotchGeometry;
/** レンダラーから届く島の当たり判定（ウィンドウ内の座標） */
let hit = { x: 0, y: 0, width: 0, height: 0 };
let hovering = false;
let keepInteractive = false;

function computeGeometry(): NotchGeometry {
  const d = screen.getPrimaryDisplay();
  const menuBar = d.workArea.y - d.bounds.y;
  // ノッチ付きの MacBook はメニューバーが 32pt 以上になる
  const hasNotch = menuBar >= 32;
  return {
    hasNotch,
    width: config.notchWidth ?? (hasNotch ? 200 : 180),
    height: hasNotch ? menuBar : 30,
    windowWidth: WINDOW_W,
    windowHeight: WINDOW_H,
  };
}

function placeWindow() {
  const d = screen.getPrimaryDisplay();
  geometry = computeGeometry();
  win.setBounds({ x: Math.round(d.bounds.x + (d.bounds.width - WINDOW_W) / 2), y: d.bounds.y, width: WINDOW_W, height: WINDOW_H });
}

function createWindow() {
  win = new BrowserWindow({
    width: WINDOW_W,
    height: WINDOW_H,
    type: "panel", // NSPanel: クリックしても前面アプリからフォーカスを奪わない
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  placeWindow();

  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
  win.once("ready-to-show", () => win.showInactive());

  // 外部リンクはブラウザで開く
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

/** カーソル位置を見て、島の上にいる間だけマウスを受け取る。
 *  ファイルをドラッグ中もこの判定が効くので、ノッチへのドロップを受けられる */
function startHitTesting() {
  const MARGIN = 6;
  setInterval(() => {
    if (win.isDestroyed()) return;
    const c = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const x = c.x - b.x;
    const y = c.y - b.y;
    const inside = x >= hit.x - MARGIN && x <= hit.x + hit.width + MARGIN && y >= hit.y - MARGIN && y <= hit.y + hit.height + MARGIN;
    if (inside !== hovering) {
      hovering = inside;
      win.webContents.send("notch:hover", inside);
    }
    win.setIgnoreMouseEvents(!(inside || keepInteractive), { forward: true });
  }, 50);
}

function openAi() {
  store.set((s) => ({ aiOpenSeq: s.aiOpenSeq + 1 }));
  keepInteractive = true;
  win.focus();
}

function registerShortcuts() {
  const reg = (accel: string, fn: () => void) => {
    if (accel && !globalShortcut.register(accel, fn)) console.error(`ショートカット ${accel} は他のアプリが使っています`);
  };
  reg(config.shortcuts.ai, openAi);
  reg(config.shortcuts.timer, () => win.webContents.send("notch:command", "timer"));
  reg(config.shortcuts.record, () => (store.state.record.active ? stopRecording() : startRecording(config.recorder)));
}

function registerIpc() {
  ipcMain.handle("notch:initial", () => ({ state: store.state, geometry, config }));
  ipcMain.on("notch:hit-rect", (_e, r: typeof hit) => (hit = r));
  ipcMain.on("notch:focus", (_e, focus: boolean) => {
    // 入力欄（AI・クイック返信）を使う間だけキー入力を受け取る
    keepInteractive = focus;
    if (focus) win.focus();
    else win.blur();
  });
  ipcMain.on("music", (_e, cmd) => musicCommand(cmd));
  ipcMain.on("claude:decide", (_e, id: string, d: "allow" | "deny") => decidePermission(id, d));
  ipcMain.on("meeting:join", (_e, url: string) => /^https:\/\//.test(url) && shell.openExternal(url));
  ipcMain.on("clip:paste", (_e, id: string) => pasteClip(id, () => win.blur()));
  ipcMain.on("clip:remove", (_e, id: string) => removeClip(id));
  ipcMain.on("notice:dismiss", (_e, id: string) => dismissNotice(id));
  ipcMain.handle("notice:reply", (_e, id: string, text: string) => replyNotice(id, text));
  ipcMain.on("notice:open", (_e, id: string) => openNoticeUrl(id));
  ipcMain.on("shelf:add", (_e, paths: string[]) => addToShelf(paths));
  ipcMain.on("shelf:remove", (_e, id: string) => removeFromShelf(id));
  ipcMain.on("shelf:open", (_e, id: string) => openShelfFile(id));
  ipcMain.on("shelf:share", (_e, id: string) => shareShelfFile(id, win));
  ipcMain.on("shelf:drag", (e, id: string) => startShelfDrag(id, e.sender));
  ipcMain.on("record:start", () => startRecording(config.recorder));
  ipcMain.on("record:stop", () => stopRecording());
  ipcMain.on("record:reveal", () => revealRecording());
  ipcMain.on("ai:ask", (_e, q: string, ctx?: string) => askAi(config.ai, q, ctx));
  ipcMain.on("ai:cancel", () => cancelAi());
  ipcMain.on("ai:reset", () => resetAi());
}

function createTray() {
  // 島の形をしたテンプレート画像（32px = 16pt@2x。メニューバーの色に自動で合う）
  const icon = nativeImage.createFromBuffer(
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAYUlEQVR42u2UMQ7AIAhFPUvPyC09ERNlYOjUaKP5bfpe8kYEQWkNAADusbSnnsakXrH2JPFRwbHIXmcOszL5tYjhtscmTXX7qS74xgL8EwXIRyB/hPJv+IpFJF/FAAD/4QTEwP+5+3E2WAAAAABJRU5ErkJggg==", "base64"),
    { scaleFactor: 2 },
  );
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip("Notch Island");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "AI に質問", accelerator: config.shortcuts.ai, click: openAi },
      { label: "設定ファイルを開く", click: () => shell.openPath(path.join(DATA_DIR, "config.json")) },
      { type: "separator" },
      { label: "Notch Island を終了", role: "quit" },
    ]),
  );
}

app.whenReady().then(async () => {
  app.dock?.hide();
  createWindow();
  createTray();
  registerIpc();
  registerShortcuts();
  startHitTesting();
  screen.on("display-metrics-changed", placeWindow);
  screen.on("display-added", placeWindow);
  screen.on("display-removed", placeWindow);
  store.on("change", (s) => !win.isDestroyed() && win.webContents.send("notch:state", s));

  startServer(config);
  startNowPlaying();
  startCalendar(config.calendar);
  startClipboard();
  startPower();
  startMicMonitor();
  await loadShelf();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopRecording();
});
