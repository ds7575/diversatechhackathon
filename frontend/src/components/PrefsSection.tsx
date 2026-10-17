"use client";

import { useState } from "react";
import type { Pace, Transport, TripPrefs } from "@/lib/types";

const INTERESTS = ["food", "nightlife", "nature", "museums", "shopping", "beaches", "photo spots", "budget-friendly"];
const TRANSPORT: Transport[] = ["walk", "transit", "car"];
const PACE: Pace[] = ["chill", "balanced", "packed"];

const field = "min-h-11 w-full border-2 border-ink bg-card px-3 text-sm";
const legend = "label-mono text-[11px] font-bold";

function Seg<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="mt-1 flex gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`label-mono min-h-11 flex-1 border-2 border-ink text-xs font-bold ${
            value === o ? "bg-ink text-paper" : "bg-card"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const unknown = value === null;
  return (
    <div className="flex-1">
      <label className={legend}>
        {label}
        <input
          type="date"
          disabled={unknown}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={`${field} mt-1 disabled:opacity-50`}
        />
      </label>
      <label className="mt-1 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={unknown}
          onChange={(e) => onChange(e.target.checked ? null : new Date().toISOString().slice(0, 10))}
          className="h-5 w-5"
        />
        {label} unknown
      </label>
    </div>
  );
}

export function PrefsSection({
  prefs,
  onSave,
}: {
  prefs: TripPrefs;
  onSave: (p: TripPrefs) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(prefs);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const set = <K extends keyof TripPrefs>(k: K, v: TripPrefs[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await onSave(draft);
      setMsg({ text: "Saved.", error: false });
    } catch {
      setMsg({ text: "Couldn't save. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 border-2 border-ink bg-card">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="prefs-body"
          onClick={() => setOpen((o) => !o)}
          className="label-mono flex min-h-11 w-full items-center justify-between px-3 text-xs font-bold"
        >
          Travel preferences
          <span aria-hidden>{open ? "−" : "+"}</span>
        </button>
      </h2>
      {open && (
        <div id="prefs-body" className="flex flex-col gap-4 border-t-2 border-ink p-3">
          <label className={legend}>
            Hotel / base location
            <input
              value={draft.base}
              onChange={(e) => set("base", e.target.value)}
              placeholder="Unknown"
              className={`${field} mt-1 font-sans normal-case tracking-normal`}
            />
          </label>
          <div className="flex gap-3">
            <DateField label="Start" value={draft.start_date} onChange={(v) => set("start_date", v)} />
            <DateField label="End" value={draft.end_date} onChange={(v) => set("end_date", v)} />
          </div>
          <div>
            <span className={legend}>Transport</span>
            <Seg name="Transport" options={TRANSPORT} value={draft.transport} onChange={(v) => set("transport", v)} />
          </div>
          <label className={legend}>
            Budget per person
            <input
              inputMode="decimal"
              value={draft.budget_pp}
              onChange={(e) => set("budget_pp", e.target.value)}
              placeholder="Unknown"
              className={`${field} mt-1 font-sans normal-case tracking-normal`}
            />
          </label>
          <div>
            <span className={legend}>Pace</span>
            <Seg name="Pace" options={PACE} value={draft.pace} onChange={(v) => set("pace", v)} />
          </div>
          <fieldset>
            <legend className={legend}>Priorities</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = draft.interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set("interests", on ? draft.interests.filter((x) => x !== i) : [...draft.interests, i])
                    }
                    className={`label-mono min-h-11 border-2 border-ink px-3 text-[11px] font-bold ${
                      on ? "bg-sun" : "bg-card"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {i}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className={legend}>
            Notes / firm limits
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. no stairs, vegetarian, nothing over EUR 40"
              className="mt-1 w-full border-2 border-ink bg-card p-3 font-sans text-sm normal-case tracking-normal"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="label-mono min-h-11 bg-airmail-red text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {msg && (
            <p role={msg.error ? "alert" : "status"} className={`text-sm font-bold ${msg.error ? "text-airmail-red" : ""}`}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
