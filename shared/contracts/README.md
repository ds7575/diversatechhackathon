# Integration contract v0.1

Shared normalized interface for Person 1 and Person 2. Frontend payload adapters are implemented in `utils/frontend-card.js`; the HTTP routes still require Person 2's backend handlers.
Use JSON with camelCase keys, opaque string IDs, date-only YYYY-MM-DD values and UTC ISO timestamps. Unknown researched facts are null or absent, never invented. Import `index.js` for route/status constants and validators and `fixtures.js` for a synthetic GET snapshot. No dependencies. Both Node and browser ES modules are supported.

## Requests and responses

All routes are relative to the backend's agreed base URL. JSON success bodies are listed below. Errors are `{error:{code,message}}`, never provider payloads or credentials. Use 400 for invalid input, 401 for missing identity, 403 for nonmembership, 404 for missing records, 409 for revision conflicts and 503 for unavailable processing.

| Method/path | Request JSON | Success JSON |
| --- | --- | --- |
| GET /api/trips | none | `Group[]` |
| POST /api/trips | `{name,destination,members}` | `Group` |
| GET /api/trips/:tripId | none | `Group` |
| POST /api/trips/:tripId/members | `{members}` | `Group` |
| GET/POST /api/trips/:tripId/reels | none / `{url}` | `Reel[]` / `Reel` |
| POST /api/trips/:tripId/reels/:reelId/retry | none | empty success |
| GET/PUT /api/trips/:tripId/prefs | none / `TripPrefs` | `TripPrefs` |
| POST /api/trips/:tripId/places/:placeId/reactions | `{kind}` | empty success |
| POST /api/trips/:tripId/places/:placeId/confirm | none | empty success |
| POST /api/trips/:tripId/places/:placeId/fix | `{name}` | empty success |
| GET /api/trips/:tripId/itinerary | none | `Itinerary` |
| POST /api/trips/:tripId/itinerary/generate | `{confirm}` | `Itinerary`; 409 when confirmation is required |
| PUT /api/trips/:tripId/places/:placeId/day | `{day:number\|null}` | empty success |

Snapshot: `{trip,members,imports,importPlaces,places,evidence,recommendations,reactions,concerns,assignments,planRevision}`. `importPlaces` contains `{importId,placeId}` links so a deduplicated place can retain every Reel source. Refresh/poll GET after an import until terminal status; queued/processing are nonterminal. Ready, partially_ready, needs_confirmation and failed are terminal. Keep successful places even on partial failure. Store the import and enqueue processing before returning 202.

Trip fields match creation plus `id`. Member: `{id,tripId,displayName,preferences,firmLimits}`. Preferences use `{interests,budgetLevel?,activityLevel?,crowdPreference?,maxTravelMinutes?}`. Enumerations are exported from `index.js`; travel time is an integer from 0–240 minutes. Firm limits use `{maxPriceLevel?,accessibilityRequired?,prohibitedActivities?}` and are the only member criteria allowed to veto a recommendation. Budget is optional trip display text, not a currency calculation. No inferred limit is applied by the planner.

Import: `{id,tripId,normalizedUrl,thumbnailUrl,contributorIds,status,errorCode}`. `thumbnailUrl` is the source Reel thumbnail and may be null when the provider cannot supply one. Place: `{id,tripId,name,matchStatus,area,latitude,longitude,brief,practical}`; area/coordinates/brief may be null, practical is a JSON object. Evidence: `{id,placeId,sourceUrl,retrievedAt,facts,source?,sourcePath?,timestampSeconds?}` where facts is an array of strings and the optional fields locate the exact caption, transcript, or provider-supplied on-screen text. Reaction: `{placeId,memberId,value}`; missing entry means unanswered. Concern: `{id,placeId,memberId,kind,note}`. Assignment: `{placeId,date,position,manual,reason}` where null date means Unassigned, positions are unique nonnegative integers per bucket and reason is nonempty. One assignment per saved place after plan generation, including Unassigned.

Recommendation: `{placeId,verdict,score,headline,text,evidenceStatus,memberEvaluations}`. The score is an internal deterministic input to the label and is never returned as a user-facing match percentage. `headline` and `text` are concise frontend copy. Every trip member appears exactly once in `memberEvaluations` as `{memberId,fit,matchedCriteria,conflicts}`. The generated text attributes matches and tradeoffs to specific members. An ordinary conflict such as budget, distance, or effort lowers fit but does not veto a recommendation; only an explicit firm limit uses `blocked`. Missing research uses `insufficient_information`. Uncertain places may only be `needs_more_information` or `not_recommended`. Person 2 sends `createRecommendationInput(...)` to the model, then passes its structured assessments through `buildGroupRecommendation(...)`; raw provider prose is never returned directly to the frontend.

Trip board: `buildTripBoard(snapshot)` converts normalized snapshot records into `{tripId,title,destination,dateRange,gist,days,ideas}`. Each day is `{date,label,gist,cards}` and `ideas` contains unassigned or not-yet-planned cards. Cards include `{placeId,name,area,sourceReel,brief,verdict,score,headline,text,reason,manual}`. `sourceReel` contains `{importId,url,thumbnailUrl,contributorIds}` so Person 1 can use the original Reel thumbnail as the Pinterest pin image and link the card back to its Reel. A missing thumbnail remains `null`, and missing research receives neutral fallback copy rather than an invented recommendation.

Frontend adapters: `toFrontendTripBoard(board, context)` preserves the richer Pinterest board and adds a `boardingPass` object to every card. `toFrontendItinerary(...)` emits the current numeric-day `{generated,days,places}` contract, and `toFrontendReels(...)` emits nested Reel records for the Ideas screen. Their place fields match Person 1's current `Place`: `{id,name,summary,location,cost,caveats,label,reason,contributors,reelUrl,counts,mine,status,day}`. The richer boarding-pass adapter also supplies `thumbnailUrl` for the planned Reel-thumbnail enhancement. `context` is `{members,reactions,concerns,currentMemberId?}`.

Backend extraction adapter: `adaptInstagramExtraction(...)` maps Person 2's caption-first result into `{import,places,importPlaces,evidence}`. It accepts `/p/`, `/reel/`, `/reels/`, and `/tv/` permalinks to match the backend. Extracted candidates always remain `uncertain` and the import remains `needs_confirmation`; only later place matching may confirm them. `thumbnailUrl` is an optional explicit input because the current backend does not expose a thumbnail. When no candidate is found, the adapter returns `errorCode:"no_explicit_place"` without inventing a place.

## Ownership, persistence and concurrency

Person 1: import fixtures into mock hooks now; later swap in the route calls. On manual moves/removals, set `manual:true`, move removals to null date, and renumber destination positions. Submit the full assignment list and last planRevision. On 409, reload and let the user reconcile edits. Explicit replacement confirmation sets replaceManual true; never do this by default.

Person 2: derive identity from your chosen server-verified session, never a request memberId or display name. Check membership and trip scope for every route (join instead validates the private invite). Create organizer membership atomically with trip creation. Hash invite tokens in storage, check expiry/revocation, and do not expose them in GET snapshots. Keep provider keys in backend config. Auth transport, framework and deployment remain team decisions.

On plan writes/generation, validate assignments and atomically compare/increment trips.plan_revision with expectedRevision in the SAME transaction as replacing assignments. Roll back and return 409 if no row matches. Preserve manual assignments during regeneration, including Unassigned removals. Pass is ranking input, not a veto; ordinary concerns do not exclude places. Backend interprets firm limits and passes excludedPlaceIds to the planner. Conflicting/stale manual edits fail validation for explicit resolution.

Before planning, `deduplicatePlaceRecords(...)` can merge repeated real-world places across Reels while retaining every `importPlaces` link and remapping evidence. Verified provider identity is authoritative; normalized name with matching area or nearby coordinates is the fallback. `generateItinerary(...)` accepts optional provider-neutral `travelTimes` records with origin, destination, minutes, distance and mode. When those records are absent it falls back to coordinates and area, so Google or another routing provider remains a backend-only choice.

Database adapters map camelCase to snake_case; JSON fields serialize into *_json columns. Deduplicate imports on (trip_id, normalized_url), preserve contributors in import_contributors, and deduplicate places on (trip_id, identity_key), using a provider ID or reviewed stable identity. Join import_places to retain all sources for a deduplicated place. The raw schema supplies structural constraints; API validators enforce date, membership and plan semantics. Provider spend enforcement and workers remain backend responsibilities.
