import { Plane } from "lucide-react";
import type { ReactNode } from "react";

export function FlightPath({
  day,
  leg,
  explanation,
  children,
}: {
  day: number;
  leg: string;
  explanation?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={`Day ${day}`} className="relative pl-10">
      <header className="mb-3">
        <h3 className="label-mono text-sm font-bold">
          Day {String(day).padStart(2, "0")} · Leg {leg}
        </h3>
        {explanation && <p className="mt-1 text-sm text-ink-soft">{explanation}</p>}
      </header>
      <span
        aria-hidden
        className="absolute bottom-0 left-4 top-2 border-l-2 border-dotted border-airmail-blue"
      />
      <span
        aria-hidden
        className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-airmail-blue text-white"
      >
        <Plane size={16} className="rotate-90" />
      </span>
      <div className="flex flex-col gap-4 pb-6">{children}</div>
    </section>
  );
}
