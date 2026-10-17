import { Luggage } from "lucide-react";

export type ConcernKind = "price" | "distance" | "effort";

export function LuggageTag({
  kind,
  count,
  note,
}: {
  kind: ConcernKind;
  count?: number;
  note?: string;
}) {
  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span
        className="label-mono relative inline-flex items-center gap-1.5 bg-airmail-red py-1.5 pl-6 pr-3 text-[11px] font-bold text-white"
        style={{ clipPath: "polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)" }}
      >
        <span aria-hidden className="absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-paper" />
        <Luggage aria-hidden size={12} />
        {kind}
        {count ? ` ×${count}` : ""}
      </span>
      {note && <span className="font-hand text-lg leading-tight text-ink">“{note}”</span>}
    </div>
  );
}
