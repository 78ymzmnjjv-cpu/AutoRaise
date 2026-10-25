import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { api, useHover, useNotchState } from "@/lib/store";
import { timer, useTimer } from "@/lib/timer";
import { useNow } from "@/lib/useNow";
import { Island, type Mode } from "./Island";
import type { View } from "@/activities/types";
import { musicView } from "@/activities/Music";
import { claudeDoneView, claudeView } from "@/activities/Claude";
import { timerView } from "@/activities/Timer";
import { dropView, shelfView } from "@/activities/Shelf";
import { meetingView } from "@/activities/Meeting";
import { clipboardFlashView, clipboardView } from "@/activities/Clipboard";
import { noticeFlashView, noticesView } from "@/activities/Notices";
import { airpodsView, powerFlashView } from "@/activities/Power";
import { recordSavedView, recordView } from "@/activities/Record";
import { aiView } from "@/activities/Ai";
import { homeView, type HomeTarget } from "@/activities/Home";

/** ホバーが外れてから畳むまでの猶予。カーソルが一瞬はみ出しても閉じない */
const COLLAPSE_DELAY = 350;

export function App() {
  const s = useNotchState();
  const hover = useHover();
  const t = useTimer();
  const now = useNow(1000);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HomeTarget | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const firstSeq = useRef(s.aiOpenSeq);

  // ホバーで開く。外れたら少し待って畳む
  useEffect(() => {
    if (hover) {
      setOpen(true);
      return;
    }
    const id = setTimeout(() => setOpen(false), COLLAPSE_DELAY);
    return () => clearTimeout(id);
  }, [hover]);

  // 入力欄にフォーカスがある間は畳まない（クイック返信の途中で消えないように）
  useEffect(() => {
    const onIn = (e: FocusEvent) => setTyping(e.target instanceof HTMLInputElement);
    const onOut = () => setTyping(false);
    window.addEventListener("focusin", onIn);
    window.addEventListener("focusout", onOut);
    return () => {
      window.removeEventListener("focusin", onIn);
      window.removeEventListener("focusout", onOut);
    };
  }, []);

  // グローバルショートカット
  useEffect(() => {
    if (s.aiOpenSeq !== firstSeq.current) setAiOpen(true);
  }, [s.aiOpenSeq]);
  useEffect(() => api.onCommand((cmd) => cmd === "timer" && timer.toggle()), []);

  const closeAi = () => {
    setAiOpen(false);
    api.setFocusable(false);
  };

  const pick = (k: HomeTarget) => {
    if (k === "ai") setAiOpen(true);
    else if (k === "timer" && t.phase === "idle") timer.start();
    else if (k === "record") s.record.active ? api.recordStop() : api.recordStart();
    if (k !== "ai" && k !== "record") setSelected(k);
  };

  // --- 何を出すかの決定 ---
  const transient = s.transient && s.transient.until > now ? s.transient : undefined;
  const transientView: View | undefined = (() => {
    switch (transient?.kind) {
      case "clipboard": return s.clipboard.length ? clipboardFlashView(s.clipboard) : undefined;
      case "notice": return s.notices.length ? noticeFlashView(s.notices) : undefined;
      case "power": return s.power ? powerFlashView(s.power) : undefined;
      case "airpods": return s.power?.airpods ? airpodsView(s.power.airpods) : undefined;
      case "claude-done": return claudeDoneView(s.claude.sessions);
      case "record-saved": return recordSavedView(s.record);
      default: return undefined;
    }
  })();

  const rec = recordView(s.record);
  const claude = claudeView(s.claude.sessions, s.claude.pending);
  const meeting = s.meeting ? meetingView(s.meeting, now) : undefined;
  const timerV = timerView(t);
  const music = s.music ? musicView(s.music) : undefined;
  const shelf = shelfView(s.shelf);
  const permission = s.claude.pending.length ? claude : undefined;

  // 優先度：録画・マイク > Claude の許可待ち > 一時表示 > 会議直前 > Claude 実行中 > タイマー > 音楽 > シェルフ
  const primary = [rec, permission, transientView, meeting?.compact ? meeting : undefined, claude, timerV, music, s.shelf.length ? shelf : undefined].find(
    (v) => v?.compact,
  );

  const byTarget: Record<HomeTarget, View | undefined> = {
    ai: undefined,
    timer: timerV,
    record: rec,
    shelf,
    clipboard: clipboardView(s.clipboard),
    notices: noticesView(s.notices),
    meeting,
  };

  let view: View | undefined;
  let mode: Mode = "idle";
  if (aiOpen) {
    view = aiView(s.ai, s.clipboard[0] && now - s.clipboard[0].at < 5 * 60_000 ? s.clipboard[0] : undefined, closeAi);
  } else if (dragging) {
    view = dropView();
  } else if (permission) {
    // 許可待ちはホバーしていなくても開いたままにする
    view = permission;
  } else if (open || typing) {
    // シェルフだけが残っているときは、ホバーでホーム画面（シェルフのタイル付き）を出す
    view = (selected && byTarget[selected]) || (primary?.key !== "shelf" ? primary : undefined) || homeView(s, pick);
    if (!view.expanded) view = homeView(s, pick);
  } else if (primary) {
    view = primary;
  }
  if (view?.expanded && (aiOpen || dragging || permission || open || typing)) mode = "expanded";
  else if (view?.compact) mode = "compact";

  // 畳んだら選択を戻す
  useEffect(() => {
    if (mode !== "expanded") setSelected(null);
  }, [mode]);

  return (
    <MotionConfig reducedMotion="user">
      <Island
        mode={mode}
        view={mode === "idle" ? undefined : view}
        onDragState={setDragging}
        onDropFiles={(files) => {
          api.shelfAdd(files);
          setSelected("shelf");
        }}
      />
    </MotionConfig>
  );
}
