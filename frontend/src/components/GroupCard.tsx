import Link from "next/link";
import type { Group } from "@/lib/types";
import { AirmailStripe } from "./ui/AirmailStripe";
import { Sticker } from "./ui/Sticker";

const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function GroupCard({ group }: { group: Group }) {
  const dates =
    group.start_date && group.end_date
      ? `${fmt(group.start_date)} – ${fmt(group.end_date)}`
      : "Dates TBD";
  const shown = group.members.slice(0, 4);
  const extra = group.members.length - shown.length;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="lift relative block border-2 border-ink bg-card"
      aria-label={`${group.name}, ${group.destination}, ${dates}, ${group.members.length} members, ${group.reel_count} Reels`}
    >
      <AirmailStripe height={6} />
      <div className="flex">
        <div className="min-w-0 flex-1 p-4">
          <h2 className="break-words font-heading text-2xl font-extrabold leading-tight tracking-tight">
            {group.name}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{group.destination}</p>
          <p className="label-mono mt-3 text-xs font-bold">{dates}</p>
        </div>
        <div aria-hidden className="relative w-0 border-l-2 border-dashed border-ink">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-2 border-ink bg-paper" />
          <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border-2 border-ink bg-paper" />
        </div>
        <div className="flex w-32 shrink-0 flex-col justify-between gap-3 p-3">
          <div className="flex flex-wrap gap-1">
            {shown.map((m, i) => (
              <Sticker key={m.id} name={m.name} index={i} />
            ))}
            {extra > 0 && (
              <span className="label-mono inline-flex h-8 items-center text-[11px] font-bold">+{extra}</span>
            )}
          </div>
          <p className="label-mono text-[11px] font-bold">
            {group.reel_count} {group.reel_count === 1 ? "Reel" : "Reels"}
          </p>
        </div>
      </div>
    </Link>
  );
}
