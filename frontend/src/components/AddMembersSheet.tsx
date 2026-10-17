"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Group, NewMember } from "@/lib/types";
import { PeopleInput } from "./PeopleInput";

export function AddMembersSheet({
  group,
  onAdded,
}: {
  group: Group;
  onAdded: (g: Group) => void;
}) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<NewMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onAdded(await api.addMembers(group.id, people));
      setPeople([]);
      setOpen(false);
    } catch {
      setError("Couldn't add people. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label-mono min-h-11 border-2 border-ink bg-sun px-4 text-xs font-bold"
      >
        + Add people
      </button>
      {open && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/50">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-members-title"
            className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto border-2 border-b-0 border-ink bg-paper p-4"
          >
            <h2 id="add-members-title" className="font-heading text-2xl font-extrabold">
              Add people to {group.name}
            </h2>
            <div className="mt-4">
              <PeopleInput
                people={people}
                onChange={setPeople}
                existingPhones={group.members.map((m) => m.phone)}
              />
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-airmail-red">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPeople([]);
                }}
                className="label-mono min-h-11 flex-1 border-2 border-ink bg-card text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || people.length === 0}
                onClick={save}
                className="label-mono min-h-11 flex-1 bg-airmail-red text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? "Adding…" : `Add ${people.length || ""}`.trim()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
