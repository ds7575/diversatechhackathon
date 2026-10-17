const COLORS = ["bg-sun", "bg-mint", "bg-airmail-red text-white", "bg-airmail-blue text-white"];

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
      className={`label-mono inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink text-[11px] font-bold ${COLORS[index % COLORS.length]}`}
    >
      {initials(name)}
    </span>
  );
}
