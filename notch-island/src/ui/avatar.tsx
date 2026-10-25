import { cn, hueFrom } from "@/lib/utils";

export function Avatar({ name, color, size = 26, className }: { name: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full border-2 border-black font-bold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.42, background: color ?? `hsl(${hueFrom(name)} 65% 45%)` }}
      title={name}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ names, max = 3, size = 26 }: { names: string[]; max?: number; size?: number }) {
  const rest = names.length - max;
  return (
    <div className="flex">
      {names.slice(0, max).map((n, i) => (
        <Avatar key={n + i} name={n} size={size} className={i ? "-ml-2" : ""} />
      ))}
      {rest > 0 && (
        <span className="-ml-2 grid place-items-center rounded-full border-2 border-black bg-zinc-700 text-[10px] font-bold text-zinc-100" style={{ width: size, height: size }}>
          +{rest}
        </span>
      )}
    </div>
  );
}
