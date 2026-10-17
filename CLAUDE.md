# Group Travel Planner: iPhone-first prototype (3-hour hackathon)

Friends share public Instagram Reels into a shared trip. The app extracts places, researches them, and creates place cards explaining group fit. Members react or flag concerns (price/distance/effort). The app proposes a loose day-by-day plan that everyone can edit.
Differentiator: suggestion → researched place → group interest + concerns → explained day assignment. Reel import alone is NOT the pitch.
Scale: ~20–30 Reels, groups of 3–8.

## Stack
- `frontend/`: Next.js (App Router, TypeScript, Tailwind, src dir), calls backend via `NEXT_PUBLIC_API_URL`; mock data when `NEXT_PUBLIC_USE_MOCK=true`
- `backend/`: Node API server (see docs/architecture.md), holds all API keys
- Supabase Postgres + Realtime (edits sync across phones)
- Glasser API: Reel info, media download, transcript, place search (Serper), webpage extraction
- Claude API: Haiku for extraction/briefs, Sonnet for plan generation; vision for sampled frames (stretch)
- Run locally, expose via cloudflared/ngrok for iPhones + iOS Shortcut
- See docs/architecture.md and docs/product-scope.md for system design.

## File ownership (only edit your lane)
- Frontend: `frontend/` only
- Backend: `backend/` only
- Linker: `shared/` (contracts, database schema, utils), `docs/`, `CLAUDE.md`
- `shared/contracts` is the shared type contract. Only the linker edits it. Need a field? Say so.

## Data model
```
trips(id, destination, start_date?, end_date?, base_area?, transport, budget_pp?, currency, interests[], pace, invite_token, invite_revoked bool)
members(id, trip_id, name, session_token,
        prefs jsonb {interests[], budget, activity_level, firm_limits?, accessibility?})
imports(id, trip_id, member_id, url_normalized, status, error?, created_at)   -- unique(trip_id, url_normalized)
        status: queued | processing | ready | partial | needs_confirmation | failed
places(id, trip_id, name, lat?, lng?, address?, status: ready | needs_confirmation,
       brief jsonb {summary, distinctive, location_text,
                    cost {amount?, currency?, per_person?},
                    caveats[1-2], label: strong | discuss | needs_info, reason,
                    sources [{url, title, retrieved_at}]},
       day int|null, position int, day_reason?, in_plan bool)
place_sources(place_id, import_id, member_id)   -- all contributors + Reels kept on merge
reactions(member_id, place_id, kind, note?)     -- kind: interested | pass | price | distance | effort
day_notes(trip_id, day, explanation)
spend(id, provider, endpoint, cost_usd, created_at)
```
No reaction row = no response. That is never the same as Pass.

## Import pipeline (per Reel)
1. Normalize URL, dedupe within trip, store contributor, return immediately ("Saved. Researching your suggestions.")
2. Glasser: fetch Reel info/caption, transcript, media (frames = stretch goal)
3. Claude: extract candidate place names from caption + transcript (+ frames). Output JSON only.
4. Glasser place search with destination context; reject results far from destination
5. Merge duplicates by name + proximity into existing place (add place_sources row, no re-enrichment)
6. Brief from retrieved data only; nulls for unknowns
7. Set status. Successful places survive if others in the same Reel fail.
Ambiguous match → `needs_confirmation`, excluded from planning until a member confirms/fixes.

## Recommendations
- Label (Strong option / Worth discussing / Needs more information) + one short reason covering interest fit, budget fit, effort/distance, and open concerns or missing info.
- No numeric match scores. Never imply unanimous agreement.

## Plan generation
- Input: confirmed places + reactions + trip/member prefs (stored data only, no Glasser calls).
- Favor broad interest; group by area; balance effort; leave downtime; extras go to Unassigned.
- Concerns are discussion signals; only explicit firm limits exclude.
- Coordinates support grouping only, not drive times.
- Each day gets a one-line explanation.
- Validate before saving: places belong to trip, valid day numbers, no duplicates, no unconfirmed places.
- If any place already has a day, require `confirm=true`. Never silently overwrite edits.
- Edits (move day, unassign, remove from plan) never delete the saved idea.

## Hard rules
- Never invent place names, prices, addresses, hours, closures, booking needs, accessibility, allergy suitability, or review consensus. Unknown = null, shown as unknown.
- Review-based pros/cons only from actual retrieved review text.
- Keys server-side only. Every route checks trip membership via session cookie; display name is not auth.
- No Glasser calls for reactions, concerns, or day edits.
- Glasser has no published output schema: parse from `fixtures/*.json` (real responses), never guess shapes.
- Timeouts + bounded retries (max 2). Log every paid call to `spend`. Refuse new calls if projected Glasser spend > $9.
- Delete temporary media after processing.

## UI rules
- Mobile-first, single column, max-width 480px. Tabs: Ideas | Plan. Persistent Add button.
- Place card: name, summary, distinctive, location, cost (currency + per person or "Cost unknown"), 1–2 caveats, label + reason, contributor(s), original Reel link, reaction buttons. Expand for sources + retrieved date.
- Reactions as text buttons with counts; concern buttons allow an optional note; concerns stay visible.
- Plan: day buckets with explanation + Unassigned. "Move to day" select (no required drag), "Remove from plan".
- Correction flows: confirm match, fix match, add place manually, retry failed import.
- Accessibility: 44pt targets, VoiceOver labels, text not color alone, no autoplay, no clipping at large text, `aria-live="polite"` for import status only.
- Components take handlers as props (`onReact`, `onMoveDay`, `onConfirm`, `onFixMatch`, `onRetry`) so mocks swap for real calls.

## Design: "Airmail & Boarding Pass"
Playful, student-friendly travel theme. Bright and tactile, never corporate or drab.

**Palette (CSS vars in globals.css)**
- `--paper` #FFF6E5 (warm cream background), `--card` #FFFFFF
- `--ink` #14213D (navy text), `--ink-soft` #4A5578
- `--airmail-red` #E63946 (primary actions, concerns), `--airmail-blue` #2B59C3 (links, Plan tab)
- `--sun` #FFC93C (highlights, "Strong option"), `--mint` #3FB68B (Interested)
- Airmail stripe (repeating red/blue diagonal): allowed only as a thin 4px accent on the top of boarding pass cards. Never in headers or full backgrounds.

**Type (Google Fonts via next/font)**
- Headings: Bricolage Grotesque 700–800, big and tight (trip name 40px+)
- Body: DM Sans
- Codes and labels: Space Mono, uppercase, letter-spaced (DAY 01, GATE, costs, dates)
- Handwritten notes on concerns: Caveat

**Signature components**
- Trip header = postcard: huge destination name, dates as "DEPART / RETURN" in mono, member avatars as round initials stickers, and a thin flight route line (dotted `--ink-soft` line with a small plane partway along it, mono HOME / destination labels at each end; plane glides in <600ms on load, none under reduced motion). Header is a white card, 1px `--ink` at 10% border, 16px radius, 24px padding, 32px gap before content. No stripe.
- Place card = boarding pass: perforated dashed divider with notched circles; left "ticket" has name, summary, cost, caveats; right "stub" has the reaction buttons and contributor. Reel link as "View original ✈".
- Recommendation label = rotated passport stamp (dashed border, -6deg): STRONG OPTION (sun), WORTH DISCUSSING (blue), NEEDS INFO (ink-soft).
- Concerns = luggage-tag chips (tag shape with hole) and the note in Caveat.
- Plan days = flight legs: "DAY 01 · LEG A" header, dotted flight path line connecting places down the left edge with a small plane icon on it. Unassigned = "Standby".
- Import status = small plane flying along a dotted arc while processing; lands with a check when ready; failed shows a red "Delayed, Retry" pill.
- Empty state: illustrated SVG paper plane + "No boarding passes yet, share a Reel to get started."

**Interaction and motion (makes it feel alive)**
- Tap a reaction: stamp-press animation (scale 1.15 → 1, slight rotate) + count bumps.
- Move to day: card slides out and the plane icon hops to the new leg.
- Generate plan: button becomes "Boarding…" with a plane taxiing across; days fade in one by one.
- Tabs as a toggle with a sliding indicator; cards lift slightly on press.
- Use CSS transitions or Framer Motion only. Wrap all motion in `prefers-reduced-motion` and make it instant when reduced.

**Icons:** lucide-react (Plane, PlaneTakeoff, MapPin, Luggage, Ticket, Stamp). No emoji as icons.

**Avoid:** purple/indigo, full-page gradients, Inter, generic rounded-2xl + drop-shadow cards, centered SaaS hero, stock-photo backgrounds.
**Keep accessible:** all text ≥ 4.5:1 contrast on cream; color is never the only signal (labels always have text); decorations are `aria-hidden`.

## Out of scope
Native app, TikTok/YouTube, booking/payments, expense splitting, hourly schedules, route optimization, auto-replanning, group chat, push notifications, maps (lists only).

## Working style
- Be terse. No explanations unless asked.
- Don't run the dev server; the human will.
- Stay in your lane. One feature per prompt. Small diffs.