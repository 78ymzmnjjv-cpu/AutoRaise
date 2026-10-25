---
title: Notch Island 引き継ぎ
tags: [notch-island, claude-code, 引き継ぎ]
created: 2026-10-25
repo: 78ymzmnjjv-cpu/AutoRaise
branch: claude/notch-island
pr: https://github.com/78ymzmnjjv-cpu/AutoRaise/pull/1
---

# Notch Island 引き継ぎ

クラウドの Claude Code で作った「Mac のノッチを Live Activity にするアプリ」を、Mac 上の Claude Code で仕上げるためのメモ。

## 使い方

1. Mac のターミナルで下の「準備」を実行する
2. `claude` を起動して、「引き継ぎプロンプト」をそのまま貼る
3. 終わったらチェックリストに印を付ける

## 準備（Mac のターミナル）

```bash
# まだ clone していなければ
git clone https://github.com/78ymzmnjjv-cpu/AutoRaise.git ~/AutoRaise
cd ~/AutoRaise
git fetch origin claude/notch-island
git checkout claude/notch-island
cd notch-island
claude
```

## 引き継ぎプロンプト（ここから下を貼る）

```text
あなたは Mac 上でこのリポジトリを引き継ぎます。notch-island/ にある「Notch Island」（MacBook のノッチを Live Activity にする Electron アプリ）を、この Mac で実際に動かして仕上げてください。私は許可をなるべく全部出すので、確認なしでどんどん進めて構いません。ただし git push・PR へのコメント・設定ファイル（~/.claude/settings.json など）の書き換えは、何をするか一言伝えてから実行してください。

## 前提
- ブランチ: claude/notch-island（PR: https://github.com/78ymzmnjjv-cpu/AutoRaise/pull/1）
- まず notch-island/README.md と notch-island/HANDOFF.md を読むこと
- 技術: Electron 38 + React 19 + motion（Framer Motion）+ Tailwind v4。部品は 21st.dev / shadcn 互換（src/ui、components.json）
- これまでは Linux でしか動かしていない。型チェック・ビルド・ブラウザ表示・Electron の起動・ローカル API と Claude Code hook の往復は確認済み。Mac 実機での動作は未確認
- GitHub Actions（.github/workflows/notch-island.yml）が macOS で起動確認と .dmg 作成をする。最新の結果と成果物のスクリーンショット（smoke-screenshots）も見ること

## やること（上から順に）
1. `npm install` → `npm run build:helpers` → `npm run dev` で起動する
2. 島がノッチにぴったり重なるか確認する。ずれていたら electron/main.ts の computeGeometry / placeWindow（メニューバーの高さからノッチを判定、幅は既定 200px）を直す。メニューバーより上に出ない場合は、パネルのウィンドウレベルや setBounds の扱いを調べて直す
3. ホバーで開く・離れると閉じる・島の外はクリックが下のアプリに届く、を確認する（electron/main.ts の startHitTesting）
4. 10機能を1つずつ実機で確認し、動かないものは直す。必要な macOS の権限（オートメーション・アクセシビリティ・画面収録・マイク）は、ダイアログが出たら私が許可する
   - 01 音楽: Spotify かミュージックで再生して、曲名・再生位置・曲送り
   - 02 Claude Code: `npm run install-hooks` のあと、別の Claude Code で何か作業させて進捗が出るか。許可を求められたとき島のボタンで許可・拒否できるか
   - 03 タイマー: ⌥⇧T
   - 04 シェルフ: Finder からノッチへドロップ、ドラッグで取り出し、共有メニュー（AirDrop）
   - 05 予定: ~/.notch-island/config.json の calendar.icsUrls に私のカレンダーの ICS URL を入れる（URL は私が渡す）
   - 06 コピー履歴: コピーで確認表示、クリックで前面アプリに貼り付け
   - 07 通知: `node scripts/notify.mjs "テスト" "本文" --app LINE`
   - 08 充電・AirPods: 電源の抜き差し、AirPods の接続
   - 09 録画: ⌥⇧R で開始・停止し、保存とサムネイルを確認。マイク表示は音声入力でも出る（邪魔なら recorder.showMicIndicator を false）
   - 10 AI: ⌥Space。API キーは ANTHROPIC_API_KEY か config.json の ai.apiKey（キーは私が設定する）
5. 直したら `npm run typecheck` と `npm run build` を通し、`npm run smoke` で起動確認してからコミットする
6. 最後に、確認できたこと・直したこと・まだ動かないことを箇条書きで報告し、HANDOFF.md のチェックリストを更新する

## 注意
- 音声入力で指示することが多いので、聞き間違いっぽい単語は文脈で解釈してよい
- モデル名をコミットメッセージや PR に書かない
```

## チェックリスト

- [ ] 起動して島がノッチに重なる
- [ ] ホバーで開閉、島の外のクリックが下に届く
- [ ] 01 音楽
- [ ] 02 Claude Code の進捗と許可ボタン
- [ ] 03 タイマー
- [ ] 04 シェルフ（ドロップ・取り出し・AirDrop）
- [ ] 05 次の予定
- [ ] 06 コピー履歴と貼り付け
- [ ] 07 通知とクイック返信
- [ ] 08 充電・AirPods
- [ ] 09 録画・マイク表示
- [ ] 10 AI に質問
- [ ] .dmg をインストールしてログイン時に起動

## ここまでの状況（2026-10-25）

- 実装: 10機能すべて、ホーム画面、優先度による表示切り替え
- 確認済み（Linux）: 型チェック、ビルド、ブラウザでの全画面、Electron 起動、トークン保護、hook → 島 → 許可の往復
- 自動チェック: macOS ランナーでのビルド・起動・キャプチャ・.dmg 作成を PR #1 で実行中
- 実機で怪しいところ
  - ノッチ位置への重ね方（パネルのレベル、メニューバーより上に出せるか）
  - `screencapture -v` を SIGINT で止めたときの保存
  - シェルフからのドラッグ（startDrag）と共有メニュー
  - ミュージック.app はジャケット画像が取れない（色で代用）
- .dmg は未署名。開けないときは右クリック →「開く」か `xattr -dr com.apple.quarantine "/Applications/Notch Island.app"`
