export type RecLabel = "strong" | "discuss" | "needs_info";

const STYLES: Record<RecLabel, { text: string; cls: string }> = {
  strong: { text: "Strong option", cls: "bg-sun text-ink border-ink" },
  discuss: { text: "Worth discussing", cls: "bg-card text-airmail-blue border-airmail-blue" },
  needs_info: { text: "Needs info", cls: "bg-card text-ink-soft border-ink-soft" },
};

export function PassportStamp({ label }: { label: RecLabel }) {
  const s = STYLES[label];
  return (
    <span
      className={`label-mono inline-block -rotate-6 border-2 border-dashed px-2 py-1 text-[11px] font-bold leading-tight ${s.cls}`}
    >
      {s.text}
    </span>
  );
}
