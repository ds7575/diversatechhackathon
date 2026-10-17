import { memberColor } from "@/lib/memberColor";

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Sticker({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <span
      aria-hidden
      className="label-mono inline-flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-ink/20 text-[11px] font-bold text-ink"
      style={{ background: memberColor(index) }}
    >
      {initials(name)}
    </span>
  );
}
