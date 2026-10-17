import { Plane } from "lucide-react";
import type { ReactNode } from "react";

const fmt = (d: string | null) => d ?? "Unknown";

export function TripHeader({
  name,
  destination,
  start,
  end,
  children,
}: {
  name: string;
  destination: string;
  start: string | null;
  end: string | null;
  children?: ReactNode;
}) {
  const city = destination.split(",")[0].toUpperCase();
  return (
    <header className="mb-8 rounded-2xl border border-ink/10 bg-card p-6">
      <h1 className="break-words font-heading text-[40px] font-extrabold leading-none tracking-tight">{name}</h1>
      <p className="label-mono mt-2 text-xs">{destination}</p>
      <dl className="label-mono mt-3 flex gap-6 text-xs">
        <div>
          <dt className="text-[10px] text-ink-soft">Depart</dt>
          <dd className="font-bold">{fmt(start)}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-ink-soft">Return</dt>
          <dd className="font-bold">{fmt(end)}</dd>
        </div>
      </dl>
      <div aria-hidden className="label-mono mt-5 flex items-center gap-3 text-[11px] font-bold">
        <span>HOME</span>
        <span className="relative h-0 flex-1 border-t-2 border-dotted border-ink-soft">
          <Plane
            size={18}
            className="plane-glide absolute -top-[10px] rotate-45 bg-card px-0.5 text-ink"
            style={{ left: "55%" }}
          />
        </span>
        <span className="min-w-0 truncate">{city}</span>
      </div>
      {children && <div className="mt-6">{children}</div>}
    </header>
  );
}
