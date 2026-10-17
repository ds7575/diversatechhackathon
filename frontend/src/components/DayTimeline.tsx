"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { Place, ReactionKind, TimeBlock } from "@/lib/types";

const BLOCKS: { id: TimeBlock; label: string; start: string }[] = [
  { id: "morning", label: "Morning", start: "10:00" },
  { id: "afternoon", label: "Afternoon", start: "14:00" },
  { id: "evening", label: "Evening", start: "19:00" },
];

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function duration(min: number | null | undefined) {
  if (!min) return "Duration unknown";
  if (min < 60) return `~${min} min`;
  return `~${Math.round((min / 60) * 10) / 10} h`;
}

function gapText(prev: Place, next: Place) {
  if (prev.start_time && prev.duration_min && next.start_time) {
    const gap = toMin(next.start_time) - (toMin(prev.start_time) + prev.duration_min);
    if (gap > 0) return `Free time / travel · ~${gap} min`;
  }
  return "Free time / travel";
}

export type PlaceHandlers = {
  onMoveDay: (placeId: string, day: number | null) => void;
  onMoveBlock: (placeId: string, block: TimeBlock) => void;
  onRemove?: (placeId: string) => void;
  onReact?: (placeId: string, kind: ReactionKind) => void;
};

const REACTIONS: { kind: ReactionKind; label: string; selected: string }[] = [
  { kind: "interested", label: "Interested", selected: "bg-mint text-ink" },
  { kind: "pass", label: "Pass", selected: "bg-airmail-red text-white" },
  { kind: "price", label: "Price", selected: "bg-sun text-ink" },
  { kind: "distance", label: "Distance", selected: "bg-airmail-blue text-white" },
  { kind: "effort", label: "Effort", selected: "bg-[#e9ddf8] text-ink" },
];

const PLACE_HIGHLIGHTS: Record<ReactionKind, string> = {
  interested: "bg-mint",
  pass: "bg-[#ffdada]",
  price: "bg-sun",
  distance: "bg-[#d9eaff]",
  effort: "bg-[#e9ddf8]",
};

export function PlaceMenu({
  place,
  days,
  onMoveDay,
  onMoveBlock,
  onRemove,
}: PlaceHandlers & { place: Place; days: number[] }) {
  const [open, setOpen] = useState(false);
  const sel = "min-h-11 w-full border-2 border-ink bg-paper px-2 text-sm";
  return (
    <div className="relative shrink-0" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        aria-label={`Options for ${place.name}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-card"
      >
        <MoreHorizontal aria-hidden size={18} />
      </button>
      {open && (
        <div role="group" aria-label={`Options for ${place.name}`} className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-2 border-2 border-ink bg-card p-3">
          <label className="label-mono text-[11px] font-bold">
            <span className="sr-only">Move {place.name} to day</span>
            <select
              value={place.day ?? ""}
              onChange={(e) => {
                onMoveDay(place.id, e.target.value ? Number(e.target.value) : null);
                setOpen(false);
              }}
              className={sel}
            >
              <option value="">Move to day…</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  Day {String(d).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>
          {place.day !== null && (
            <label className="label-mono text-[11px] font-bold">
              <span className="sr-only">Move {place.name} to time of day</span>
              <select
                value={place.time_block ?? ""}
                onChange={(e) => {
                  if (e.target.value) onMoveBlock(place.id, e.target.value as TimeBlock);
                  setOpen(false);
                }}
                className={sel}
              >
                <option value="">Move to time of day…</option>
                {BLOCKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    Move to {b.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => {
                onRemove(place.id);
                setOpen(false);
              }}
              aria-label={`Remove ${place.name} from plan`}
              className="label-mono min-h-11 border-2 border-ink bg-card px-3 text-[11px] font-bold"
            >
              Remove from plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DayTimeline({
  places,
  days,
  highlighted = false,
  ...handlers
}: PlaceHandlers & { places: Place[]; days: number[]; highlighted?: boolean }) {
  if (places.length === 0) return <p className="text-sm text-ink-soft">Nothing here yet. Downtime.</p>;

  const sorted = [...places].sort((a, b) => {
    const ba = a.time_block ? BLOCKS.findIndex((x) => x.id === a.time_block) : 3;
    const bb = b.time_block ? BLOCKS.findIndex((x) => x.id === b.time_block) : 3;
    return ba - bb || (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99");
  });
  const groups = [
    ...BLOCKS.map((b) => ({ key: b.id as string, label: `${b.label} · ~${b.start}`, items: sorted.filter((p) => p.time_block === b.id) })),
    { key: "anytime", label: "Anytime", items: sorted.filter((p) => !p.time_block) },
  ].filter((g) => g.items.length > 0);

  let prev: Place | null = null;
  return (
    <div className="flex flex-col gap-4">
      <p className="label-mono text-[11px] text-ink-soft">Suggested times, adjust as you like</p>
      {groups.map((g) => (
        <div key={g.key}>
          <h4 className="label-mono text-[11px] font-bold">{g.label}</h4>
          <ul className="mt-2">
            {g.items.map((p) => {
              const before = prev;
              prev = p;
              return (
                <li key={p.id}>
                  {before && (
                    <div className="grid grid-cols-[3rem_1.5rem_1fr] items-stretch">
                      <span />
                      <span aria-hidden className="mx-auto w-px bg-ink/30" />
                      <p className="py-2 text-xs italic text-ink-soft">{gapText(before, p)}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-[3rem_1.5rem_1fr] items-start">
                    <span className="label-mono pt-3 text-xs font-bold">{p.start_time ?? ""}</span>
                    <span aria-hidden className="relative mx-auto h-full w-px bg-ink/30">
                      <span className="absolute -left-[4px] top-4 h-[9px] w-[9px] rounded-full border-2 border-ink bg-paper" />
                    </span>
                    <article className={`flex items-start gap-2 border-2 border-ink p-3 ${p.mine ? PLACE_HIGHLIGHTS[p.mine] : highlighted ? "bg-sun shadow-[5px_5px_0_var(--ink)]" : "bg-card"}`}>
                      <div className="min-w-0 flex-1">
                        <h5 className="break-words font-heading text-lg font-extrabold leading-tight">{p.name}</h5>
                        <p className="label-mono mt-1 text-[11px] text-ink-soft">{p.location}</p>
                        <p className="label-mono mt-1 text-[11px]">{duration(p.duration_min)}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {REACTIONS.map(({ kind, label, selected }) => (
                            <button
                              key={kind}
                              type="button"
                              aria-pressed={p.mine === kind}
                              aria-label={`${label} for ${p.name}, ${p.counts[kind] ?? 0} so far`}
                              onClick={() => handlers.onReact?.(p.id, kind)}
                              className={`label-mono min-h-9 border border-ink px-2 text-[9px] font-bold ${p.mine === kind ? selected : "bg-card text-ink"}`}
                            >
                              {label} {p.counts[kind] ?? 0}
                            </button>
                          ))}
                        </div>
                      </div>
                      <PlaceMenu place={p} days={days} {...handlers} />
                    </article>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
