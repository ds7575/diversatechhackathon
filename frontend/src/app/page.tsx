"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GroupCard } from "@/components/GroupCard";
import { Logo } from "@/components/ui/Logo";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Group } from "@/lib/types";

export default function Home() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.listGroups().then(setGroups, () => setError(true));
  }, []);

  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pb-28 pt-8">
      <header className="mb-8 rounded-2xl border border-ink/10 bg-card p-6">
        <div className="flex items-center gap-[14px]">
          <Logo size="lg" />
          <h1 className="font-heading text-[44px] font-extrabold leading-none tracking-tight">My Trips</h1>
        </div>
      </header>
      <div className="flex flex-col gap-4">
        {error && <p role="alert" className="font-bold text-airmail-red">Couldn&apos;t load trips.</p>}
        {!error && groups === null && <p className="label-mono text-xs">Loading…</p>}
        {groups?.length === 0 && <EmptyState message="No trips yet, start one with friends." />}
        {groups?.map((g) => <GroupCard key={g.id} group={g} />)}
      </div>
      <div className="fixed inset-x-0 bottom-0 bg-paper px-4 pb-4 pt-3">
        <Link
          href="/groups/new"
          className="label-mono mx-auto flex min-h-14 w-full max-w-[480px] items-center justify-center bg-accent text-sm font-bold text-white"
        >
          + New trip
        </Link>
      </div>
    </main>
  );
}
