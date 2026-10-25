import ical, { type ParameterValue, type VEvent } from "node-ical";
import { store } from "../store";
import type { MeetingState, NotchConfig } from "../../shared/types";

const JOIN_RE = /https:\/\/(?:meet\.google\.com\/[a-z0-9-]+|[\w.-]*zoom\.us\/j\/[^\s"<>]+|teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>]+|[\w.-]*webex\.com\/[^\s"<>]+)/i;

const text = (v: ParameterValue | undefined) => (v == null ? "" : typeof v === "string" ? v : String(v.val ?? ""));

let upcoming: MeetingState[] = [];

async function refresh(urls: string[]) {
  const from = new Date(Date.now() - 2 * 3600_000);
  const to = new Date(Date.now() + 24 * 3600_000);
  const all: MeetingState[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url.replace(/^webcal:/, "https:"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await ical.async.parseICS(await res.text());
      for (const c of Object.values(data)) {
        if (!c || c.type !== "VEVENT") continue;
        const ev = c as VEvent;
        if (ev.status === "CANCELLED") continue;
        for (const inst of ical.expandRecurringEvent(ev, { from, to, expandOngoing: true })) {
          if (inst.isFullDay) continue;
          const e = inst.event;
          const attendees = (Array.isArray(e.attendee) ? e.attendee : e.attendee ? [e.attendee] : [])
            .map((a) => (typeof a === "string" ? a : a.params?.CN || a.val))
            .map((s) => String(s).replace(/^mailto:/i, ""));
          const blob = [text(e.location), text(e.description), typeof e.url === "string" ? e.url : ""].join(" ");
          all.push({
            title: text(inst.summary) || "（無題の予定）",
            start: inst.start.getTime(),
            end: inst.end.getTime(),
            joinUrl: blob.match(JOIN_RE)?.[0],
            attendees,
            location: text(e.location) || undefined,
          });
        }
      }
    } catch (err) {
      console.error("カレンダーを取得できませんでした:", url.slice(0, 40), err);
    }
  }
  upcoming = all.sort((a, b) => a.start - b.start);
  tick();
}

/** 1時間以内に始まる予定、または開始から15分以内の予定を1件だけ出す */
function tick() {
  const now = Date.now();
  const m = upcoming.find((x) => x.end > now && x.start - now < 60 * 60_000 && now - x.start < 15 * 60_000);
  const cur = store.state.meeting;
  if (m?.start !== cur?.start || m?.title !== cur?.title) store.set({ meeting: m });
}

export function startCalendar(cfg: NotchConfig["calendar"]) {
  if (!cfg.icsUrls.length) return;
  refresh(cfg.icsUrls);
  setInterval(() => refresh(cfg.icsUrls), Math.max(1, cfg.refreshMinutes) * 60_000);
  setInterval(tick, 15_000);
}
