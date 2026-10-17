"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PeopleInput } from "@/components/PeopleInput";
import { api } from "@/lib/api";
import type { NewMember } from "@/lib/types";

const field = "min-h-11 w-full border-2 border-ink bg-card px-3 text-base";

export default function NewGroup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [people, setPeople] = useState<NewMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const g = await api.createGroup({ name: name.trim(), destination: destination.trim(), members: people });
      router.push(`/groups/${g.id}`);
    } catch {
      setError("Couldn't create the trip. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pb-12 pt-6">
      <Link href="/" className="label-mono flex min-h-11 items-center text-xs font-bold text-airmail-blue underline">
        Back
      </Link>
      <h1 className="font-heading text-[40px] font-extrabold leading-none tracking-tight">New trip</h1>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="trip-name" className="label-mono text-xs font-bold">Trip name</label>
          <input id="trip-name" required className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="trip-dest" className="label-mono text-xs font-bold">Destination</label>
          <input id="trip-dest" required className={field} value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="label-mono mb-2 text-xs font-bold">Who&apos;s coming</legend>
          <PeopleInput people={people} onChange={setPeople} />
        </fieldset>
        {error && <p role="alert" className="text-sm font-bold text-airmail-red">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="label-mono min-h-14 bg-airmail-red text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create trip"}
        </button>
      </form>
    </main>
  );
}
