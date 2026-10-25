import { osascript } from "../exec";
import { store } from "../store";
import type { MusicCommand, MusicState } from "../../shared/types";

// アプリごとの取得スクリプト。"is running" で囲むので、起動していないアプリを立ち上げてしまうことはない
const SCRIPTS: Record<MusicState["app"], string> = {
  Spotify: `
    if application "Spotify" is running then
    tell application "Spotify"
    if player state is stopped then return ""
    set t to current track
    return (name of t) & tab & (artist of t) & tab & (album of t) & tab & (player state as string) & tab & (player position as string) & tab & ((duration of t) / 1000 as string) & tab & (artwork url of t)
    end tell
    end if
    return ""`,
  Music: `
    if application "Music" is running then
    tell application "Music"
    if player state is stopped then return ""
    set t to current track
    return (name of t) & tab & (artist of t) & tab & (album of t) & tab & (player state as string) & tab & (player position as string) & tab & (duration of t as string) & tab & ""
    end tell
    end if
    return ""`,
};

const num = (s: string) => Number(s.replace(",", ".")) || 0;

async function read(app: MusicState["app"]): Promise<MusicState | undefined> {
  const out = await osascript(SCRIPTS[app]).catch(() => "");
  if (!out) return undefined;
  const [title, artist, album, state, pos, dur, art] = out.split("\t");
  return {
    app,
    title,
    artist,
    album,
    artworkUrl: art || undefined,
    playing: state === "playing",
    position: num(pos),
    duration: num(dur),
    sampledAt: Date.now(),
  };
}

let lastApp: MusicState["app"] = "Spotify";

async function poll() {
  const [spotify, music] = await Promise.all([read("Spotify"), read("Music")]);
  // 再生中のほうを優先。両方止まっていれば直近のアプリを残す
  const next =
    [spotify, music].find((m) => m?.playing) ??
    (lastApp === "Spotify" ? spotify ?? music : music ?? spotify);
  if (next) lastApp = next.app;
  store.set({ music: next });
}

export function startNowPlaying() {
  poll();
  setInterval(poll, 1500);
}

export async function musicCommand(cmd: MusicCommand) {
  const app = store.state.music?.app ?? lastApp;
  const verb = cmd === "playpause" ? "playpause" : cmd === "next" ? "next track" : "previous track";
  await osascript(`tell application "${app}" to ${verb}`).catch(() => undefined);
  setTimeout(poll, 250);
}
