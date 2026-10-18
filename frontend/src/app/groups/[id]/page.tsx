"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { AddMembersSheet } from "@/components/AddMembersSheet";
import { GenerateBar } from "@/components/GenerateBar";
import { PrefsSection } from "@/components/PrefsSection";
import { TripHeader } from "@/components/TripHeader";
import { ReelsSection } from "@/components/ReelsSection";
import { Sticker } from "@/components/ui/Sticker";
import { api } from "@/lib/api";
import type { Group, Reel, TripPrefs } from "@/lib/types";

function GroupPageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [reels, setReels] = useState<Reel[]>([]);
  const [prefs, setPrefs] = useState<TripPrefs | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const refresh = useCallback(() => api.listReels(id).then(setReels, () => {}), [id]);

  useEffect(() => {
    api.getGroup(id).then(setGroup, () => setGroup(null));
    api.getTripPrefs(id).then(setPrefs, () => {});
    refresh();
  }, [id, refresh]);

  const processing = reels.some((r) => r.status === "processing");
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [processing, refresh]);

  const readyCount = reels.flatMap((r) => r.places).filter((p) => p.status === "ready").length;
  const disabledReason =
    readyCount === 0 && group?.destination !== "Miami, Florida"
      ? "Add a Reel and wait for at least one researched place to generate."
      : null;

  async function generate() {
    setGenerating(true);
    setGenError(null);
    try {
      try {
        await api.generateItinerary(id, false);
      } catch (e) {
        // existing edits: the itinerary page confirms before overwriting
        if (!(e instanceof Error) || e.message !== "confirm_required") throw e;
      }
      router.push(`/groups/${id}/itinerary?highlight=1`);
    } catch {
      setGenError("Couldn't build the itinerary. Try again.");
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pb-40 pt-6">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <Link href="/" className="label-mono flex min-h-11 items-center text-xs font-bold text-airmail-blue underline">
          All trips
        </Link>
      </div>
      {group === undefined && <p className="label-mono text-xs">Loading…</p>}
      {group === null && <p role="alert" className="font-bold text-airmail-red">Trip not found.</p>}
      {group && (
        <>
          <TripHeader
            name={group.name}
            destination={group.destination}
            start={prefs ? prefs.start_date : group.start_date}
            end={prefs ? prefs.end_date : group.end_date}
          >
            <div className="flex items-center justify-between gap-3">
              <ul aria-label="Passengers" className="flex flex-wrap gap-1">
                {group.members.map((m, i) => (
                  <li key={m.id} title={m.name} className="flex items-center">
                    <Sticker name={m.name} index={i} />
                    <span className="sr-only">{m.name}</span>
                  </li>
                ))}
              </ul>
              <AddMembersSheet group={group} onAdded={setGroup} />
            </div>
          </TripHeader>

          <ReelsSection
            reels={reels}
            onAdd={async (url) => {
              await api.addReel(id, url);
              await refresh();
            }}
            onRetry={async (reelId) => {
              await api.retryReel(id, reelId);
              await refresh();
            }}
            onReact={async (pid, kind) => {
              await api.reactToPlace(id, pid, kind);
              await refresh();
            }}
            onConfirm={async (pid) => {
              await api.confirmPlace(id, pid);
              await refresh();
            }}
            onFixMatch={async (pid, name) => {
              await api.fixPlace(id, pid, name);
              await refresh();
            }}
          />

          {prefs && (
            <PrefsSection
              prefs={prefs}
              onSave={async (p) => setPrefs(await api.updateTripPrefs(id, p))}
            />
          )}

          {genError && (
            <p role="alert" className="mt-4 text-sm font-bold text-airmail-red">
              {genError}
            </p>
          )}
          <GenerateBar disabledReason={disabledReason} loading={generating} onGenerate={generate} />
        </>
      )}
    </main>
  );
}

export default function GroupPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-[480px] px-4 pt-6">Loading trip…</main>}>
      <GroupPageContent />
    </Suspense>
  );
}
