import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { NotchApi, NotchState } from "../shared/types";

const on = <T>(channel: string, cb: (v: T) => void) => {
  const h = (_: unknown, v: T) => cb(v);
  ipcRenderer.on(channel, h);
  return () => {
    ipcRenderer.removeListener(channel, h);
  };
};

const api: NotchApi = {
  getInitial: () => ipcRenderer.invoke("notch:initial"),
  onState: (cb) => on<NotchState>("notch:state", cb),
  onHover: (cb) => on<boolean>("notch:hover", cb),
  onCommand: (cb) => on<"timer">("notch:command", cb),
  setHitRect: (rect) => ipcRenderer.send("notch:hit-rect", rect),
  setFocusable: (focus) => ipcRenderer.send("notch:focus", focus),
  music: (cmd) => ipcRenderer.send("music", cmd),
  decidePermission: (id, d) => ipcRenderer.send("claude:decide", id, d),
  joinMeeting: (url) => ipcRenderer.send("meeting:join", url),
  pasteClip: (id) => ipcRenderer.send("clip:paste", id),
  removeClip: (id) => ipcRenderer.send("clip:remove", id),
  dismissNotice: (id) => ipcRenderer.send("notice:dismiss", id),
  replyNotice: (id, text) => ipcRenderer.invoke("notice:reply", id, text),
  openNoticeUrl: (id) => ipcRenderer.send("notice:open", id),
  // Electron 32 以降は File.path が無いので webUtils で実パスを得る
  shelfAdd: (files) => ipcRenderer.send("shelf:add", files.map((f) => webUtils.getPathForFile(f)).filter(Boolean)),
  shelfRemove: (id) => ipcRenderer.send("shelf:remove", id),
  shelfOpen: (id) => ipcRenderer.send("shelf:open", id),
  shelfShare: (id) => ipcRenderer.send("shelf:share", id),
  shelfStartDrag: (id) => ipcRenderer.send("shelf:drag", id),
  recordStart: () => ipcRenderer.send("record:start"),
  recordStop: () => ipcRenderer.send("record:stop"),
  revealRecording: () => ipcRenderer.send("record:reveal"),
  askAi: (q, ctx) => ipcRenderer.send("ai:ask", q, ctx),
  cancelAi: () => ipcRenderer.send("ai:cancel"),
  resetAi: () => ipcRenderer.send("ai:reset"),
};

contextBridge.exposeInMainWorld("notch", api);
