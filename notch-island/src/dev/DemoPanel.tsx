import { useEffect, useState } from "react";
import { api } from "@/lib/store";
import { SCENES } from "@/lib/mock";

type Demo = { scene(id: string): void; hover(h: boolean): void };
const demo = (api as unknown as { demo: Demo }).demo;

/** ブラウザ確認用：各機能の状態に切り替えるボタン。?scene=music のように URL でも指定できる */
export function DemoPanel() {
  const [current, setCurrent] = useState(() => new URLSearchParams(location.search).get("scene") ?? "idle");
  const [hover, setHover] = useState(false);

  useEffect(() => {
    demo.scene(current);
    setHover(!!SCENES.find((s) => s.id === current)?.hover || new URLSearchParams(location.search).has("hover"));
  }, [current]);
  useEffect(() => demo.hover(hover), [hover, current]);

  return (
    <div className="fixed inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1.5 bg-black/60 p-3 backdrop-blur">
      {SCENES.map((s) => (
        <button
          key={s.id}
          onClick={() => setCurrent(s.id)}
          className={`rounded-full px-3 py-1 text-xs ${current === s.id ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          {s.label}
        </button>
      ))}
      <label className="ml-3 flex items-center gap-1.5 text-xs text-white">
        <input id="demo-hover" type="checkbox" checked={hover} onChange={(e) => setHover(e.target.checked)} />
        ホバー（展開）
      </label>
    </div>
  );
}
