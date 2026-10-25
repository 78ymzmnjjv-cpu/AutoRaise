import { randomUUID } from "node:crypto";
import { shell } from "electron";
import { store } from "../store";
import type { Notice } from "../../shared/types";

/** 通知ごとの返信先。状態としてはレンダラーに渡さない */
const replyUrls = new Map<string, string>();
const openUrls = new Map<string, string>();

export interface IncomingNotice {
  app?: string;
  title?: string;
  body?: string;
  color?: string;
  url?: string;
  replyUrl?: string;
}

const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u);

export function pushNotice(n: IncomingNotice): Notice {
  const notice: Notice = {
    id: randomUUID(),
    app: String(n.app ?? "通知").slice(0, 40),
    title: String(n.title ?? "").slice(0, 120),
    body: String(n.body ?? "").slice(0, 500),
    color: /^#[0-9a-f]{3,8}$/i.test(n.color ?? "") ? n.color : undefined,
    url: isHttp(n.url) ? n.url : undefined,
    canReply: isHttp(n.replyUrl),
    at: Date.now(),
  };
  if (notice.canReply) replyUrls.set(notice.id, n.replyUrl!);
  if (notice.url) openUrls.set(notice.id, notice.url);
  store.set((s) => ({ notices: [notice, ...s.notices].slice(0, 20) }));
  store.flash("notice");
  return notice;
}

export function dismissNotice(id: string) {
  replyUrls.delete(id);
  openUrls.delete(id);
  store.set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
}

/** 返信は通知を送ってきた側の replyUrl に JSON で POST する */
export async function replyNotice(id: string, text: string): Promise<boolean> {
  const url = replyUrls.get(id);
  if (!url || !text.trim()) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    dismissNotice(id);
    return true;
  } catch {
    return false;
  }
}

export function openNoticeUrl(id: string) {
  const url = openUrls.get(id);
  if (url) shell.openExternal(url);
  dismissNotice(id);
}
