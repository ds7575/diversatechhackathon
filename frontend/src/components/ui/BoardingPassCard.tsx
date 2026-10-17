"use client";

import { useState } from "react";
import { AirmailStripe } from "./AirmailStripe";
import { LuggageTag } from "./LuggageTag";
import { PassportStamp, type RecLabel } from "./PassportStamp";

export type ReactionKind = "interested" | "pass" | "price" | "distance" | "effort";

export type BoardingPassProps = {
  name: string;
  summary: string;
  location: string;
  cost: string; // e.g. "EUR 25 pp" or "Cost unknown"
  caveats: string[];
  label: RecLabel;
  reason: string;
  contributors: string[];
  reelUrl: string;
  counts: Partial<Record<ReactionKind, number>>;
  mine?: ReactionKind | null;
  onReact?: (kind: ReactionKind) => void;
};

const BUTTONS: { kind: ReactionKind; text: string }[] = [
  { kind: "interested", text: "Interested" },
  { kind: "pass", text: "Pass" },
  { kind: "price", text: "Price" },
  { kind: "distance", text: "Distance" },
  { kind: "effort", text: "Effort" },
];

export function BoardingPassCard(p: BoardingPassProps) {
  const [pressed, setPressed] = useState<ReactionKind | null>(null);

  return (
    <article className="lift relative border-2 border-ink bg-card">
      <AirmailStripe height={4} />
      <div className="flex">
        <div className="min-w-0 flex-1 p-4">
          <h3 className="break-words font-heading text-2xl font-extrabold leading-tight tracking-tight">
            {p.name}
          </h3>
          <p className="label-mono mt-1 text-[11px] text-ink-soft">{p.location}</p>
          <p className="mt-2 text-sm">{p.summary}</p>
          <p className="label-mono mt-2 text-xs font-bold">{p.cost}</p>
          <ul className="mt-2 list-disc pl-4 text-sm text-ink-soft">
            {p.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="mt-3 flex items-start gap-3">
            <PassportStamp label={p.label} />
            <p className="text-sm">{p.reason}</p>
          </div>
          {(["price", "distance", "effort"] as const).some((k) => (p.counts[k] ?? 0) > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(["price", "distance", "effort"] as const)
                .filter((k) => (p.counts[k] ?? 0) > 0)
                .map((k) => (
                  <LuggageTag key={k} kind={k} count={p.counts[k]} />
                ))}
            </div>
          )}
        </div>

        <div aria-hidden className="relative w-0 border-l-2 border-dashed border-ink">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-2 border-ink bg-paper" />
          <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border-2 border-ink bg-paper" />
        </div>

        <div className="flex w-32 shrink-0 flex-col gap-1 p-2">
          {BUTTONS.map(({ kind, text }) => {
            const on = p.mine === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={on}
                aria-label={`${text}, ${p.counts[kind] ?? 0} so far`}
                onClick={() => {
                  setPressed(kind);
                  p.onReact?.(kind);
                }}
                onAnimationEnd={() => setPressed(null)}
                className={`label-mono min-h-11 border-2 border-ink px-2 text-[11px] font-bold ${
                  on ? "bg-ink text-paper" : "bg-card text-ink"
                } ${pressed === kind ? "stamp-press" : ""}`}
              >
                {text} {p.counts[kind] ?? 0}
              </button>
            );
          })}
          <p className="label-mono mt-1 break-words text-[10px] text-ink-soft">
            {p.contributors.join(", ")}
          </p>
          <a
            href={p.reelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="label-mono flex min-h-11 items-center text-[11px] font-bold text-airmail-blue underline"
          >
            View original ✈
          </a>
        </div>
      </div>
    </article>
  );
}
