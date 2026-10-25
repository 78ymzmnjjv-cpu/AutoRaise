// メインプロセスとレンダラーで共有する状態の型

export interface NotchGeometry {
  /** 物理ノッチがあるか（メニューバーの高さで判定） */
  hasNotch: boolean;
  /** 待機時の島の幅・高さ（= ノッチの大きさ） */
  width: number;
  height: number;
  /** 透明ウィンドウ全体の大きさ */
  windowWidth: number;
  windowHeight: number;
}

export interface MusicState {
  app: "Spotify" | "Music";
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
  playing: boolean;
  position: number;
  duration: number;
  /** position を取得した時刻（ms）。再生中はここから補間する */
  sampledAt: number;
}

export type StepStatus = "running" | "done" | "error";

export interface ClaudeStep {
  id: string;
  label: string;
  status: StepStatus;
}

export interface ClaudeSession {
  id: string;
  project: string;
  prompt: string;
  status: "running" | "waiting" | "done";
  steps: ClaudeStep[];
  startedAt: number;
  endedAt?: number;
}

export interface PermissionRequest {
  id: string;
  sessionId: string;
  project: string;
  tool: string;
  summary: string;
  requestedAt: number;
  expiresAt: number;
}

export interface MeetingState {
  title: string;
  start: number;
  end: number;
  joinUrl?: string;
  attendees: string[];
  location?: string;
}

export interface AirPodsState {
  name: string;
  left?: number;
  right?: number;
  case?: number;
}

export interface PowerState {
  percent: number;
  charging: boolean;
  pluggedIn: boolean;
  airpods?: AirPodsState;
}

export interface RecordState {
  active: boolean;
  startedAt?: number;
  micInUse: boolean;
  lastSaved?: { path: string; thumb?: string; savedAt: number };
  error?: string;
}

export type ClipKind = "url" | "color" | "code" | "text";

export interface ClipItem {
  id: string;
  text: string;
  kind: ClipKind;
  at: number;
}

export interface Notice {
  id: string;
  app: string;
  title: string;
  body: string;
  color?: string;
  url?: string;
  canReply: boolean;
  at: number;
}

export interface ShelfFile {
  id: string;
  path: string;
  name: string;
  ext: string;
  size: number;
  icon?: string;
}

export interface AiState {
  status: "idle" | "streaming" | "done" | "error";
  question: string;
  answer: string;
  error?: string;
}

export type TransientKind =
  | "clipboard"
  | "power"
  | "airpods"
  | "notice"
  | "claude-done"
  | "record-saved";

export interface Transient {
  id: string;
  kind: TransientKind;
  until: number;
}

export interface NotchState {
  music?: MusicState;
  claude: { sessions: ClaudeSession[]; pending: PermissionRequest[] };
  meeting?: MeetingState;
  power?: PowerState;
  record: RecordState;
  clipboard: ClipItem[];
  notices: Notice[];
  shelf: ShelfFile[];
  ai: AiState;
  transient?: Transient;
  /** ショートカットで AI 入力を開いた回数。増えたらレンダラーが入力欄を開く */
  aiOpenSeq: number;
}

export interface NotchConfig {
  notchWidth: number | null;
  shortcuts: { ai: string; timer: string; record: string };
  calendar: { icsUrls: string[]; refreshMinutes: number };
  ai: { model: string; effort: "low" | "medium" | "high"; apiKey?: string };
  permissionTimeoutSec: number;
  recorder: { saveDir: string; captureAudio: boolean; showMicIndicator: boolean };
  server: { port: number };
  focus: { workMin: number; breakMin: number; sets: number };
}

export type MusicCommand = "playpause" | "next" | "previous";

/** preload が window.notch に公開する API */
export interface NotchApi {
  getInitial(): Promise<{ state: NotchState; geometry: NotchGeometry; config: NotchConfig }>;
  onState(cb: (s: NotchState) => void): () => void;
  onHover(cb: (hover: boolean) => void): () => void;
  /** グローバルショートカット（タイマー開始など）をレンダラーに伝える */
  onCommand(cb: (cmd: "timer") => void): () => void;
  setHitRect(rect: { x: number; y: number; width: number; height: number }): void;
  setFocusable(focus: boolean): void;
  music(cmd: MusicCommand): void;
  decidePermission(id: string, decision: "allow" | "deny"): void;
  joinMeeting(url: string): void;
  pasteClip(id: string): void;
  removeClip(id: string): void;
  dismissNotice(id: string): void;
  replyNotice(id: string, text: string): Promise<boolean>;
  openNoticeUrl(id: string): void;
  shelfAdd(files: File[]): void;
  shelfRemove(id: string): void;
  shelfOpen(id: string): void;
  shelfShare(id: string): void;
  shelfStartDrag(id: string): void;
  recordStart(): void;
  recordStop(): void;
  revealRecording(): void;
  askAi(question: string, context?: string): void;
  cancelAi(): void;
  resetAi(): void;
}
