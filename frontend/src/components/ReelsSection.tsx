"use client";

import { useState } from "react";
import { BoardingPassCard } from "@/components/ui/BoardingPassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaneLoader } from "@/components/ui/PlaneLoader";
import type { Place, ReactionKind, Reel } from "@/lib/types";

type Props = {
  reels: Reel[];
  onAdd: (url: string) => Promise<void>;
  onRetry: (reelId: string) => void;
  onReact: (placeId: string, kind: ReactionKind) => void;
  onConfirm: (placeId: string) => void;
  onFixMatch: (placeId: string, name: string) => void;
};

function NeedsConfirmation({
  place,
  onConfirm,
  onFixMatch,
}: {
  place: Place;
  onConfirm: Props["onConfirm"];
  onFixMatch: Props["onFixMatch"];
}) {
  const [fixing, setFixing] = useState(false);
  const [name, setName] = useState(place.name);
  return (
    <div className="border-2 border-dashed border-ink bg-card p-3">
      <p className="label-mono text-[11px] font-bold">Needs confirmation</p>
      <h4 className="mt-1 break-words font-heading text-xl font-extrabold">{place.name}</h4>
      <p className="mt-1 text-sm text-ink-soft">{place.reason}</p>
      {fixing ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onFixMatch(place.id, name.trim());
          }}
        >
          <input
            aria-label={`Correct name for ${place.name}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 min-w-0 flex-1 border-2 border-ink bg-paper px-2 text-sm"
          />
          <button type="submit" className="label-mono min-h-11 bg-airmail-red px-3 text-xs font-bold text-white">
            Save
          </button>
        </form>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onConfirm(place.id)}
            aria-label={`Confirm match for ${place.name}`}
            className="label-mono min-h-11 flex-1 bg-airmail-red text-xs font-bold text-white"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setFixing(true)}
            aria-label={`Fix match for ${place.name}`}
            className="label-mono min-h-11 flex-1 border-2 border-ink bg-card text-xs font-bold"
          >
            Fix
          </button>
        </div>
      )}
    </div>
  );
}

export function ReelsSection({ reels, onAdd, onRetry, onReact, onConfirm, onFixMatch }: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url.trim())) {
      setError("Paste a public Instagram Reel link.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAdd(url.trim());
      setUrl("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't save that link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="reels-h" className="mt-8">
      <h2 id="reels-h" className="label-mono text-xs font-bold">
        Reels · {reels.length}
      </h2>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          type="url"
          inputMode="url"
          aria-label="Instagram Reel link"
          placeholder="Paste a Reel link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-h-11 min-w-0 flex-1 border-2 border-ink bg-card px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="label-mono min-h-11 bg-airmail-red px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy ? "Extracting…" : "Extract Reel"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-airmail-red">
          {error}
        </p>
      )}

      {reels.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="No boarding passes yet, share a Reel to get started." />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-6">
          {reels.map((r) => (
            <li key={r.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-mono min-w-0 flex-1 truncate text-[11px] font-bold text-airmail-blue underline"
                >
                  {r.url.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
                <PlaneLoader status={r.status} placeCount={r.places.length} onRetry={() => onRetry(r.id)} />
              </div>
              {r.status === "ready" && r.places.length === 0 && (
                <p className="border-2 border-ink/20 bg-card p-3 text-sm text-ink-soft">
                  Glasser captured the Reel, but found no explicit place names in its available text.
                </p>
              )}
              {r.places.map((p) =>
                p.status === "needs_confirmation" ? (
                  <NeedsConfirmation key={p.id} place={p} onConfirm={onConfirm} onFixMatch={onFixMatch} />
                ) : (
                  <BoardingPassCard key={p.id} {...p} onReact={(k) => onReact(p.id, k)} />
                ),
              )}
              {!!r.sources?.length && (
                <details className="border-2 border-ink/20 bg-card p-3">
                  <summary className="label-mono cursor-pointer text-xs font-bold">
                    View Glasser extraction ({r.sources.length} sources)
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    {r.sources.map((source, index) => (
                      <div key={`${source.source}-${index}`}>
                        <p className="label-mono text-[10px] font-bold uppercase">
                          {source.source.replaceAll("_", " ")}
                          {source.timestamp_seconds !== null ? ` · ${source.timestamp_seconds}s` : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{source.extracted_text}</p>
                        {source.uncertainty?.uncertain && (
                          <p className="mt-1 text-xs text-ink-soft">Uncertain: {source.uncertainty.reason ?? "Review this extraction."}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
