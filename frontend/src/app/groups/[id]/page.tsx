"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AddMembersSheet } from "@/components/AddMembersSheet";
import { AirmailStripe } from "@/components/ui/AirmailStripe";
import { Sticker } from "@/components/ui/Sticker";
import { api } from "@/lib/api";
import type { Group } from "@/lib/types";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);

  useEffect(() => {
    api.getGroup(id).then(setGroup, () => setGroup(null));
  }, [id]);

  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pb-12 pt-6">
      <Link href="/" className="label-mono flex min-h-11 items-center text-xs font-bold text-airmail-blue underline">
        All trips
      </Link>
      {group === undefined && <p className="label-mono text-xs">Loading…</p>}
      {group === null && <p role="alert" className="font-bold text-airmail-red">Trip not found.</p>}
      {group && (
        <>
          <h1 className="break-words font-heading text-[40px] font-extrabold leading-none tracking-tight">
            {group.name}
          </h1>
          <p className="label-mono mt-2 text-xs">{group.destination}</p>
          <AirmailStripe height={10} className="mt-4" />
          <div className="mt-6 flex items-center justify-between">
            <h2 className="label-mono text-xs font-bold">Passengers · {group.members.length}</h2>
            <AddMembersSheet group={group} onAdded={setGroup} />
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {group.members.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 border-2 border-ink bg-card p-2">
                <Sticker name={m.name} index={i} />
                <span className="flex-1 text-sm">{m.name}</span>
                <span className="label-mono text-[11px] text-ink-soft">{m.phone}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
