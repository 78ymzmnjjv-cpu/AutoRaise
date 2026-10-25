import { execFile } from "node:child_process";

export function run(cmd: string, args: string[], timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.toString());
    });
  });
}

/** 複数行の AppleScript を行ごとの -e で渡して実行する */
export function osascript(script: string, timeoutMs = 4000): Promise<string> {
  const args = script
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => ["-e", l]);
  return run("osascript", args, timeoutMs).then((s) => s.trim());
}
