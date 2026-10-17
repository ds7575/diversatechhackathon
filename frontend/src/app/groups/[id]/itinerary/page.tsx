"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlightPath } from "@/components/ui/FlightPath";
import { api } from "@/lib/api";
import { TripHeader } from "@/components/TripHeader";
import { DayTimeline, PlaceMenu } from "@/components/DayTimeline";
import type { Group, Itinerary, TimeBlock } from "@/lib/types";

const LEGS = "ABCDEFGHIJ";

function ItineraryPageContent() {
  const { id } = useParams<{ id: string }>();
  const highlightGeneratedPlan = useSearchParams().get("highlight") === "1";
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
  const moveBlock = (pid: string, block: TimeBlock) => act(() => api.moveToBlock(id, pid, block));
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
      {highlightGeneratedPlan && plan?.generated && (
        <p role="status" className="mt-3 border-2 border-ink bg-sun p-3 text-sm font-bold">
          Miami demo · {plan.places.length} stops. Reactions prioritize the schedule: Interested moves up, Pass moves later, and all stops stay in the plan.
        </p>
      )}

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
              <FlightPath key={d.day} day={d.day} leg={LEGS[i] ?? String(i + 1)} explanation={d.explanation} hideLine>
                <DayTimeline
                  places={plan.places.filter((p) => p.day === d.day)}
                  days={dayNums}
                  onMoveDay={move}
                  onMoveBlock={moveBlock}
                  onRemove={remove}
                  onReact={(placeId, kind) => act(() => api.reactToPlace(id, placeId, kind))}
                  highlighted={highlightGeneratedPlan}
                />
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
                <article key={p.id} className="flex items-start gap-2 border-2 border-ink bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words font-heading text-lg font-extrabold leading-tight">{p.name}</h4>
                    <p className="label-mono mt-1 text-[11px] text-ink-soft">{p.location}</p>
                  </div>
                  <PlaceMenu place={p} days={dayNums} onMoveDay={move} onMoveBlock={moveBlock} />
                </article>
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

export default function ItineraryPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-[480px] px-4 pt-6">Loading itinerary…</main>}>
      <ItineraryPageContent />
    </Suspense>
  );
}
