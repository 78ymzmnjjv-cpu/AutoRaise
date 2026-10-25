# Notch Island

MacBook のノッチを Live Activity にするメニューバーアプリです。島は Framer Motion（`motion`）のバネで「待機 → コンパクト → 展開」と形を変え、ホバーで広がります。

## 10の機能

| # | 機能 | 中身 | 必要な設定・権限 |
|---|---|---|---|
| 01 | Now Playing | Spotify / ミュージックの曲名・ジャケット・再生位置、曲送り | 初回に「オートメーション」の許可 |
| 02 | Claude Code の進捗 | 実行中のステップ、完了通知、**許可待ちを島で承認/拒否** | `npm run install-hooks` |
| 03 | フォーカスタイマー | ポモドーロ（25分/5分×4、変更可）。`⌥⇧T` で開始 | なし |
| 04 | ファイルシェルフ | ノッチにファイルをドロップして一時保管。ドラッグで取り出し、共有メニュー（AirDrop 等） | なし |
| 05 | 次の予定 | 1時間以内の予定、5分前からカウントダウン、Meet/Zoom/Teams に参加 | `calendar.icsUrls` |
| 06 | クリップボード履歴 | コピーの確認表示、直近20件、クリックで貼り付け。パスワード類は保存しない | 貼り付けに「アクセシビリティ」 |
| 07 | 通知＋クイック返信 | ローカル API で受けた通知を最大3件表示、その場で返信 | 送る側の仕組み（下記） |
| 08 | 充電・AirPods | 電源接続時の残量、AirPods 接続時の左右・ケース残量 | なし |
| 09 | 録画・マイク使用中 | 画面収録（`⌥⇧R`）と経過時間、保存後サムネイル。他アプリのマイク使用も表示 | 「画面収録」、マイク検知は `npm run build:helpers` |
| 10 | AI に質問 | `⌥Space` で入力欄に。Claude の回答をノッチ内にストリーミング | API キー |

表示の優先度は「録画・マイク > Claude の許可待ち > 一時表示（コピー・通知など）> 会議直前 > Claude 実行中 > タイマー > 音楽 > シェルフ」です。何も無いときにホバーすると、ホーム画面（AI・タイマー・収録・シェルフ・コピー履歴・通知）が出ます。

## 起動

```bash
cd notch-island
npm install
npm run dev        # 開発（ホットリロード）
npm start          # ビルドして起動
npm run package    # .dmg を作る（release/ に出力）
```

ブラウザで見た目だけ確認するときは `npm run dev:web` を開くと、下のボタンで各機能の状態に切り替えられます（`?scene=music&hover` のように URL でも指定可）。

初回起動で `~/.notch-island/config.json` ができます。

```jsonc
{
  "notchWidth": null,                         // ノッチ幅(px)。null なら自動
  "shortcuts": { "ai": "Alt+Space", "timer": "Alt+Shift+T", "record": "Alt+Shift+R" },
  "calendar": { "icsUrls": [], "refreshMinutes": 5 },
  "ai": { "model": "claude-opus-5-5", "effort": "low" },  // "apiKey": "sk-ant-..." も書ける
  "permissionTimeoutSec": 110,
  "recorder": { "saveDir": "~/Desktop", "captureAudio": false, "showMicIndicator": true },  // 音声入力中の表示が邪魔なら false
  "server": { "port": 47811 },
  "focus": { "workMin": 25, "breakMin": 5, "sets": 4 }
}
```

## 機能ごとの設定

### 02 Claude Code
```bash
npm run install-hooks
```
`~/.claude/settings.json` に hook を追加します（元のファイルはバックアップされます）。Claude Code を開き直すと、ツールの実行がノッチに流れます。許可を求められると島が開き、「許可する / 拒否」を押せます。110秒押さなければ、いつものターミナルの確認に戻ります。アプリが起動していないときの hook は何もしません。

### 05 次の予定
Google カレンダーなら「設定 → カレンダーの統合 → iCal 形式の非公開 URL」を `calendar.icsUrls` に入れます（iCloud・Outlook の公開 URL も可）。この URL は他人に見せないでください。

### 07 通知
macOS は他のアプリの通知を読む公開 API を持たないため、ノッチへは自分で送ります。

```bash
node scripts/notify.mjs "まお" "今日の撮影、18時からでOK？" --app LINE --color "#22C55E" --reply-url https://example.com/reply
```

HTTP なら `POST http://127.0.0.1:47811/notify` に `x-notch-token: $(cat ~/.notch-island/token)` を付けて `{ "app", "title", "body", "color", "url", "replyUrl" }` を送ります。`replyUrl` があると返信ボタンが出て、返信は `{ "id", "text" }` としてそこへ POST されます。Slack・LINE の Bot や n8n / Zapier から使えます。

### 09 マイク検知
```bash
npm run build:helpers   # Xcode Command Line Tools が必要
```
CoreAudio で既定マイクの使用状況を監視する小さな Swift プログラムを作ります。無くても他の機能は動きます。

### 10 AI に質問
`ANTHROPIC_API_KEY` を環境変数に入れるか、`config.json` の `ai.apiKey` に書きます。既定は Claude Opus 5.5・effort `low`（速さ優先）。直近5分以内にコピーした内容を「クリップボードを添付」で一緒に渡せます。安全分類で断られた場合は API 側の代替モデルに自動で回します（`fallbacks: "default"`）。

## しくみ

```
electron/main.ts        ノッチ位置の透明パネル。カーソルが島の上にある間だけクリックを受ける
electron/server.ts      127.0.0.1 の小さな API（Claude hook・通知）。起動ごとのトークンで保護
electron/services/*     音楽(AppleScript)・カレンダー(ICS)・クリップボード・電源(pmset/system_profiler)・収録(screencapture)・シェルフ・通知・AI
src/Island.tsx          島本体。1つの motion.div の大きさだけを変え、中身は AnimatePresence で差し替え
src/App.tsx             どの機能を出すかの優先度とホバー・ドラッグの扱い
src/activities/*        10機能それぞれのコンパクト表示と展開表示
src/ui/*                21st.dev / shadcn と同じ書き方の部品（cn・Tailwind）
```

`components.json` を置いてあるので、21st.dev のコンポーネントは `npx shadcn@latest add "<21st.dev のコンポーネント URL>"` で `src/ui` に追加できます。

## 既知の制限

- 開発環境は Linux で、Mac 実機ではまだ動かしていません。AppleScript・`pmset`・`screencapture`・ノッチ位置の重ね方は macOS の仕様に合わせて書いていますが、実機での調整が要る可能性があります。
- AirPods の残量は 12 秒ごとの取得なので、接続から表示まで最大 12 秒ほどかかります。
- ミュージック.app はジャケット画像を取れないので、アルバム名から作った色で代用します。
