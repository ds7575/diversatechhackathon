"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlightPath } from "@/components/ui/FlightPath";
import { api } from "@/lib/api";
import { TripHeader } from "@/components/TripHeader";
import type { Group, Itinerary, Place } from "@/lib/types";

const LEGS = "ABCDEFGHIJ";

function PlanRow({
  place,
  days,
  onMoveDay,
  onRemove,
}: {
  place: Place;
  days: number[];
  onMoveDay: (placeId: string, day: number | null) => void;
  onRemove?: (placeId: string) => void;
}) {
  return (
    <article className="border-2 border-ink bg-card p-3">
      <h4 className="break-words font-heading text-xl font-extrabold leading-tight">{place.name}</h4>
      <p className="label-mono mt-1 text-[11px] text-ink-soft">{place.location}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="label-mono text-[11px] font-bold">
          <span className="sr-only">Move {place.name} to day</span>
          <select
            value={place.day ?? ""}
            onChange={(e) => onMoveDay(place.id, e.target.value ? Number(e.target.value) : null)}
            className="min-h-11 border-2 border-ink bg-paper px-2 text-sm normal-case tracking-normal"
          >
            <option value="">Move to day…</option>
            {days.map((d) => (
              <option key={d} value={d}>
                Day {String(d).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(place.id)}
            aria-label={`Remove ${place.name} from plan`}
            className="label-mono min-h-11 border-2 border-ink bg-card px-3 text-[11px] font-bold"
          >
            Remove from plan
          </button>
        )}
      </div>
    </article>
  );
}

export default function ItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [plan, setPlan] = useState<Itinerary | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api.getItinerary(id).then(setPlan, () => setPlan(null)), [id]);
  useEffect(() => {
    load();
    api.getGroup(id).then(setGroup, () => {});
  }, [id, load]);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch {
      setError("Couldn't save that change. Try again.");
    }
  }

  async function regenerate() {
    setBusy(true);
    setConfirming(false);
    await act(() => api.generateItinerary(id, true));
    setBusy(false);
  }

  const dayNums = plan?.days.map((d) => d.day) ?? [];
  const standby = plan?.places.filter((p) => p.day === null) ?? [];
  const move = (pid: string, day: number | null) => act(() => api.moveToDay(id, pid, day));
  const remove = (pid: string) => act(() => api.removeFromPlan(id, pid));

  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pb-12 pt-6">
      <Link
        href={`/groups/${id}`}
        className="label-mono flex min-h-11 items-center text-xs font-bold text-airmail-blue underline"
      >
        Back to trip
      </Link>
      {group && (
        <TripHeader name={group.name} destination={group.destination} start={group.start_date} end={group.end_date} />
      )}
      <h2 className="font-heading text-3xl font-extrabold leading-none tracking-tight">Itinerary</h2>

      {plan === undefined && <p className="label-mono mt-4 text-xs">Loading…</p>}
      {plan === null && <p role="alert" className="mt-4 font-bold text-airmail-red">Couldn&apos;t load the plan.</p>}
      {plan && !plan.generated && (
        <div className="mt-6">
          <EmptyState message="No plan yet. Go back and generate one." />
        </div>
      )}
      {plan?.generated && (
        <>
          {error && (
            <p role="alert" className="mt-4 text-sm font-bold text-airmail-red">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col">
            {plan.days.map((d, i) => (
              <FlightPath key={d.day} day={d.day} leg={LEGS[i] ?? String(i + 1)} explanation={d.explanation}>
                {plan.places
                  .filter((p) => p.day === d.day)
                  .map((p) => (
                    <PlanRow key={p.id} place={p} days={dayNums} onMoveDay={move} onRemove={remove} />
                  ))}
                {!plan.places.some((p) => p.day === d.day) && (
                  <p className="text-sm text-ink-soft">Nothing here yet. Downtime.</p>
                )}
              </FlightPath>
            ))}
          </div>

          <section aria-labelledby="standby-h" className="mt-2">
            <h2 id="standby-h" className="label-mono text-sm font-bold">
              Standby · {standby.length}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Saved ideas not in the plan yet.</p>
            <div className="mt-3 flex flex-col gap-3">
              {standby.map((p) => (
                <PlanRow key={p.id} place={p} days={dayNums} onMoveDay={move} />
              ))}
            </div>
          </section>

          <section className="mt-8 border-t-2 border-ink pt-4">
            {confirming ? (
              <div role="alertdialog" aria-labelledby="regen-h" className="border-2 border-ink bg-card p-3">
                <p id="regen-h" className="text-sm font-bold">
                  Regenerating overwrites your day edits. Saved ideas are kept. Continue?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="label-mono min-h-11 flex-1 border-2 border-ink bg-card text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={regenerate}
                    className="label-mono min-h-11 flex-1 bg-airmail-red text-xs font-bold text-white"
                  >
                    Overwrite
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(true)}
                className="label-mono min-h-11 w-full border-2 border-ink bg-sun text-xs font-bold disabled:opacity-50"
              >
                {busy ? "Boarding…" : "Regenerate"}
              </button>
            )}
          </section>
        </>
      )}
    </main>
  );
}
