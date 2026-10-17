# Prototype product scope

## Goal

Help a group turn travel ideas shared through Instagram Reels into researched place suggestions and a loose, editable trip plan while keeping the contributor, original source, group interest, and concerns attached.

## Primary workflow

1. An organizer creates a trip and records destination, dates, base area, transport, budget, interests, and preferred pace.
2. Friends join through a revocable private link and add their own preferences and firm limits.
3. A member saves a public Instagram Reel through an iOS Shortcut or the mobile web paste flow.
4. Background processing stores the link first, extracts possible places, confirms them against the destination, and researches practical details.
5. Members review place cards, choose Interested or Pass, and flag price, distance, or effort concerns.
6. The app proposes loose day buckets plus an Unassigned section and explains each grouping.
7. Members move or remove activities without losing the saved idea or silently overwriting edits.

## Build for the hackathon

- Shared trip creation and joining
- Shared and individual preferences
- Reel link capture with paste fallback
- Public Instagram Reel processing
- Separate and deduplicated place suggestions
- Research briefs with evidence and uncertainty
- Interest, Pass, and structured concerns
- Rough day-plan generation
- Manual day changes and Unassigned ideas
- State saved across refreshes and devices

## Defer

- Native application distribution
- TikTok and YouTube support
- Booking, payments, and expense splitting
- Hourly schedules and live route optimization
- Continuous automatic replanning
- Full group chat and push notifications

## Non-negotiable behavior

- Save a shared link before research begins.
- Keep partial results when one extracted place fails.
- Keep uncertain matches out of automatic plans.
- Never invent names, prices, addresses, accessibility claims, or review consensus.
- Keep no response distinct from Pass.
- Treat concerns as discussion signals unless a member marks a firm limit.
- Preserve manual plan edits unless replacement is explicitly confirmed.
- Delete temporary media according to provider terms.
- Keep total Glasser usage under the $9 prototype budget.

## Prototype acceptance path

Three members can join one trip, add preferences, submit a Reel, review extracted places, react and flag a concern, generate a rough plan, move an activity, and see that change from another device.

## Open decisions

- Frontend, backend, database, job runner, and hosting choices
- Whether the Instagram iOS Shortcut receives a usable shared URL
- Reliable extraction path for captions, transcripts, and sampled frames
- Sources for review text, prices, hours, closures, and bookings
- Model provider and its separate processing budget
- Scope reduction if visual extraction is unreliable

