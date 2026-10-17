"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import type { NewMember } from "@/lib/types";

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned) ? cleaned : null;
}

const field = "min-h-11 w-full border-2 border-ink bg-card px-3 text-base";

export function PeopleInput({
  people,
  onChange,
  existingPhones = [],
}: {
  people: NewMember[];
  onChange: (next: NewMember[]) => void;
  existingPhones?: string[];
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const n = name.trim();
    const p = normalizePhone(phone);
    if (!n) return setError("Enter a name.");
    if (!p) return setError("Enter a valid phone number, e.g. +1 415 555 0101.");
    if (people.some((x) => x.phone === p) || existingPhones.includes(p))
      return setError("That number is already added.");
    onChange([...people, { name: n, phone: p }]);
    setName("");
    setPhone("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {people.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="People to add">
          {people.map((p) => (
            <li
              key={p.phone}
              className="flex items-center gap-2 border-2 border-ink bg-card py-1 pl-3 text-sm"
            >
              <span>
                {p.name} <span className="label-mono text-[11px] text-ink-soft">{p.phone}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => onChange(people.filter((x) => x.phone !== p.phone))}
                className="flex h-11 w-11 items-center justify-center"
              >
                <X aria-hidden size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="label-mono text-xs font-bold">
          Name
        </label>
        <input
          id={`${id}-name`}
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
        <label htmlFor={`${id}-phone`} className="label-mono text-xs font-bold">
          Phone number
        </label>
        <input
          id={`${id}-phone`}
          className={field}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          autoComplete="off"
        />
        {error && (
          <p id={`${id}-err`} role="alert" className="text-sm font-bold text-airmail-red">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={add}
          className="label-mono min-h-11 border-2 border-dashed border-ink px-4 text-xs font-bold"
        >
          + Add person
        </button>
      </div>
    </div>
  );
}
