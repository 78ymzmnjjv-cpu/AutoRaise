// ブラウザ（npm run dev:web）で島の見た目を確かめるためのモック。Electron では使われない
import type { NotchApi, NotchConfig, NotchGeometry, NotchState, TransientKind } from "../../shared/types";

const geometry: NotchGeometry = { hasNotch: true, width: 200, height: 37, windowWidth: 760, windowHeight: 380 };

const config: NotchConfig = {
  notchWidth: null,
  shortcuts: { ai: "Alt+Space", timer: "Alt+Shift+T", record: "Alt+Shift+R" },
  calendar: { icsUrls: [], refreshMinutes: 5 },
  ai: { model: "claude-opus-5-5", effort: "low" },
  permissionTimeoutSec: 110,
  recorder: { saveDir: "~/Desktop", captureAudio: false, showMicIndicator: true },
  server: { port: 47811 },
  focus: { workMin: 25, breakMin: 5, sets: 4 },
};

const empty = (): NotchState => ({
  claude: { sessions: [], pending: [] },
  record: { active: false, micInUse: false },
  clipboard: [],
  notices: [],
  shelf: [],
  ai: { status: "idle", question: "", answer: "" },
  aiOpenSeq: 0,
});

const now = () => Date.now();

const sample = {
  music: (): NotchState["music"] => ({
    app: "Spotify", title: "Midnight Drive", artist: "Lo-fi Station", album: "Night Loops",
    playing: true, position: 72, duration: 223, sampledAt: now(),
  }),
  claude: (): NotchState["claude"] => ({
    sessions: [{
      id: "s1", project: "autoraise", prompt: "ノッチ島を実装して", status: "running", startedAt: now() - 68_000,
      steps: [
        { id: "a", label: "テストを実行", status: "done" },
        { id: "b", label: "AutoRaise.mm を編集", status: "running" },
      ],
    }],
    pending: [],
  }),
  clipboard: (): NotchState["clipboard"] => [
    { id: "c1", text: "https://github.com/78ymzmnjjv-cpu/AutoRaise", kind: "url", at: now() - 20_000 },
    { id: "c2", text: "#F59E3B", kind: "color", at: now() - 90_000 },
    { id: "c3", text: "npm i motion", kind: "code", at: now() - 300_000 },
    { id: "c4", text: "了解です、明日送ります", kind: "text", at: now() - 900_000 },
  ],
  notices: (): NotchState["notices"] => [
    { id: "n1", app: "Slack · #design", title: "さくら", body: "ノッチのモック見ました、いい感じ！", color: "#E11D48", canReply: true, at: now() - 30_000 },
    { id: "n2", app: "LINE", title: "まお", body: "今日の撮影、18時からでOK？", color: "#22C55E", canReply: true, at: now() - 120_000 },
    { id: "n3", app: "Gmail", title: "請求書が届いています", body: "10月分のご請求", color: "#2563EB", canReply: false, at: now() - 600_000 },
  ],
  shelf: (): NotchState["shelf"] => [
    { id: "f1", path: "/Users/me/Downloads/invoice.pdf", name: "invoice.pdf", ext: "pdf", size: 182_000 },
    { id: "f2", path: "/Users/me/Desktop/notch.fig", name: "notch.fig", ext: "fig", size: 4_200_000 },
  ],
};

type Scene =
  | "idle" | "home" | "music" | "claude" | "permission" | "claude-done" | "timer" | "shelf" | "meeting"
  | "clipboard" | "notices" | "power" | "airpods" | "record" | "record-saved" | "ai";

export const SCENES: { id: Scene; label: string; hover?: boolean }[] = [
  { id: "idle", label: "待機" },
  { id: "home", label: "ホーム", hover: true },
  { id: "music", label: "01 音楽" },
  { id: "claude", label: "02 Claude" },
  { id: "permission", label: "02 許可待ち" },
  { id: "timer", label: "03 タイマー" },
  { id: "shelf", label: "04 シェルフ", hover: true },
  { id: "meeting", label: "05 会議" },
  { id: "clipboard", label: "06 コピー" },
  { id: "notices", label: "07 通知" },
  { id: "power", label: "08 充電" },
  { id: "airpods", label: "08 AirPods" },
  { id: "record", label: "09 録画" },
  { id: "ai", label: "10 AI" },
];

export function createMockApi(): NotchApi & { demo: { scene(s: Scene): void; hover(h: boolean): void } } {
  let state = empty();
  const stateLs = new Set<(s: NotchState) => void>();
  const hoverLs = new Set<(h: boolean) => void>();
  const cmdLs = new Set<(c: "timer") => void>();
  const push = (p: Partial<NotchState>) => {
    state = { ...state, ...p };
    stateLs.forEach((l) => l(state));
  };
  const flash = (kind: TransientKind, ms = 60_000) => ({ transient: { id: String(Math.random()), kind, until: now() + ms } });
  let streamTimer: ReturnType<typeof setInterval> | undefined;

  const demo = {
    hover(h: boolean) {
      hoverLs.forEach((l) => l(h));
    },
    scene(s: Scene) {
      clearInterval(streamTimer);
      const base = empty();
      const scenes: Record<Scene, () => Partial<NotchState>> = {
        idle: () => ({}),
        home: () => ({ shelf: sample.shelf(), clipboard: sample.clipboard(), notices: sample.notices() }),
        music: () => ({ music: sample.music() }),
        claude: () => ({ claude: sample.claude() }),
        permission: () => {
          const c = sample.claude();
          c.sessions[0].status = "waiting";
          c.pending = [{ id: "p1", sessionId: "s1", project: "autoraise", tool: "Bash", summary: "git push origin feature/notch", requestedAt: now(), expiresAt: now() + 110_000 }];
          return { claude: c };
        },
        "claude-done": () => {
          const c = sample.claude();
          c.sessions[0] = { ...c.sessions[0], status: "done", endedAt: now(), steps: c.sessions[0].steps.map((x) => ({ ...x, status: "done" })) };
          return { claude: c, ...flash("claude-done") };
        },
        timer: () => {
          cmdLs.forEach((l) => l("timer"));
          return {};
        },
        shelf: () => ({ shelf: sample.shelf() }),
        meeting: () => ({ meeting: { title: "デザインレビュー", start: now() + 4 * 60_000 + 30_000, end: now() + 34 * 60_000, joinUrl: "https://meet.google.com/abc-defg-hij", attendees: ["まお", "さくら", "けん", "ゆい", "りく"] } }),
        clipboard: () => ({ clipboard: sample.clipboard(), ...flash("clipboard") }),
        notices: () => ({ notices: sample.notices(), ...flash("notice") }),
        power: () => ({ power: { percent: 82, charging: true, pluggedIn: true }, ...flash("power") }),
        airpods: () => ({ power: { percent: 82, charging: false, pluggedIn: false, airpods: { name: "まおの AirPods Pro", left: 80, right: 76, case: 18 } }, ...flash("airpods") }),
        record: () => ({ record: { active: true, startedAt: now() - 12_000, micInUse: true } }),
        "record-saved": () => ({ record: { active: false, micInUse: false, lastSaved: { path: "/Users/me/Desktop/Notch 収録.mov", savedAt: now() } }, ...flash("record-saved") }),
        ai: () => ({ aiOpenSeq: state.aiOpenSeq + 1 }),
      };
      state = { ...base, aiOpenSeq: state.aiOpenSeq };
      push(scenes[s]());
      demo.hover(!!SCENES.find((x) => x.id === s)?.hover);
    },
  };

  return {
    demo,
    getInitial: async () => ({ state, geometry, config }),
    onState: (cb) => (stateLs.add(cb), () => stateLs.delete(cb)),
    onHover: (cb) => (hoverLs.add(cb), () => hoverLs.delete(cb)),
    onCommand: (cb) => (cmdLs.add(cb), () => cmdLs.delete(cb)),
    setHitRect: () => {},
    setFocusable: () => {},
    music: (cmd) => {
      if (cmd === "playpause" && state.music) push({ music: { ...state.music, playing: !state.music.playing, sampledAt: now() } });
    },
    decidePermission: (id) => {
      push({ claude: { sessions: state.claude.sessions.map((s) => ({ ...s, status: "running" })), pending: state.claude.pending.filter((p) => p.id !== id) } });
    },
    joinMeeting: (url) => window.open(url, "_blank"),
    pasteClip: () => {},
    removeClip: (id) => push({ clipboard: state.clipboard.filter((c) => c.id !== id) }),
    dismissNotice: (id) => push({ notices: state.notices.filter((n) => n.id !== id) }),
    replyNotice: async (id) => {
      push({ notices: state.notices.filter((n) => n.id !== id) });
      return true;
    },
    openNoticeUrl: () => {},
    shelfAdd: (files) =>
      push({ shelf: [...files.map((f, i) => ({ id: `d${Date.now()}${i}`, path: f.name, name: f.name, ext: f.name.split(".").pop() ?? "", size: f.size })), ...state.shelf] }),
    shelfRemove: (id) => push({ shelf: state.shelf.filter((f) => f.id !== id) }),
    shelfOpen: () => {},
    shelfShare: () => {},
    shelfStartDrag: () => {},
    recordStart: () => push({ record: { ...state.record, active: true, startedAt: now() } }),
    recordStop: () => push({ record: { active: false, micInUse: false, lastSaved: { path: "収録.mov", savedAt: now() } }, ...flash("record-saved", 4000) }),
    revealRecording: () => {},
    askAi: (q) => {
      const full = "AutoRaise にアクセシビリティの権限がないため、ウィンドウ情報を読めていません。システム設定 › プライバシーとセキュリティ › アクセシビリティ で AutoRaise をオンにして、アプリを再起動してください。";
      let i = 0;
      push({ ai: { status: "streaming", question: q, answer: "" } });
      streamTimer = setInterval(() => {
        i += 3;
        if (i >= full.length) {
          clearInterval(streamTimer);
          push({ ai: { status: "done", question: q, answer: full } });
        } else push({ ai: { status: "streaming", question: q, answer: full.slice(0, i) } });
      }, 40);
    },
    cancelAi: () => clearInterval(streamTimer),
    resetAi: () => push({ ai: { status: "idle", question: "", answer: "" } }),
  };
}
