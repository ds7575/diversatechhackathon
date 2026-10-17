# Integration contract v0.1

Proposed interface for Person 1 and Person 2; application adapters are not implemented.
Use JSON with camelCase keys, opaque string IDs, date-only YYYY-MM-DD values and UTC ISO timestamps. Unknown researched facts are null or absent, never invented. Import `index.js` for route/status constants and validators and `fixtures.js` for a synthetic GET snapshot. No dependencies. Both Node and browser ES modules are supported.

## Requests and responses

All routes are relative to the backend's agreed base URL. JSON success bodies are listed below. Errors are `{error:{code,message}}`, never provider payloads or credentials. Use 400 for invalid input, 401 for missing identity, 403 for nonmembership, 404 for missing records, 409 for revision conflicts and 503 for unavailable processing.

| Method/path | Request JSON | Success JSON |
| --- | --- | --- |
| POST /trips | `{name,destination,startDate,endDate,baseArea?,transport?,budget?,preferences?}` | 201 `{trip,member,inviteToken}` |
| POST /trips/:tripId/members | `{inviteToken,displayName}` | 201 `{member}` (200 if already joined) |
| GET /trips/:tripId | none | 200 snapshot described below |
| PATCH /trips/:tripId/members/me | `{preferences?,firmLimits?}` | 200 `{member}` |
| POST /trips/:tripId/imports | `{url}` | 202 `{import}`; duplicate adds contributor, returns same import (200) |
| PUT /trips/:tripId/places/:placeId/reaction | `{value:"interested"\|"pass"\|null}` | 200 `{reaction}`; null deletes response |
| POST /trips/:tripId/places/:placeId/concerns | `{kind:"price"\|"distance"\|"effort",note?}` | 201 `{concern}` |
| POST /trips/:tripId/plan/generate | `{expectedRevision,replaceManual:false}` | 200 `{assignments,planRevision}` |
| PUT /trips/:tripId/plan | `{expectedRevision,assignments}` | 200 `{assignments,planRevision}` |

Snapshot: `{trip,members,imports,importPlaces,places,evidence,recommendations,reactions,concerns,assignments,planRevision}`. `importPlaces` contains `{importId,placeId}` links so a deduplicated place can retain every Reel source. Refresh/poll GET after an import until terminal status; queued/processing are nonterminal. Ready, partially_ready, needs_confirmation and failed are terminal. Keep successful places even on partial failure. Store the import and enqueue processing before returning 202.

Trip fields match creation plus `id`. Member: `{id,tripId,displayName,preferences,firmLimits}`. Preferences use `{interests,budgetLevel?,activityLevel?,crowdPreference?,maxTravelMinutes?}`. Enumerations are exported from `index.js`; travel time is an integer from 0–240 minutes. Firm limits use `{maxPriceLevel?,accessibilityRequired?,prohibitedActivities?}` and are the only member criteria allowed to veto a recommendation. Budget is optional trip display text, not a currency calculation. No inferred limit is applied by the planner.

Import: `{id,tripId,normalizedUrl,thumbnailUrl,contributorIds,status,errorCode}`. `thumbnailUrl` is the source Reel thumbnail and may be null when the provider cannot supply one. Place: `{id,tripId,name,matchStatus,area,latitude,longitude,brief,practical}`; area/coordinates/brief may be null, practical is a JSON object. Evidence: `{id,placeId,sourceUrl,retrievedAt,facts}` where facts is an array of strings. Reaction: `{placeId,memberId,value}`; missing entry means unanswered. Concern: `{id,placeId,memberId,kind,note}`. Assignment: `{placeId,date,position,manual,reason}` where null date means Unassigned, positions are unique nonnegative integers per bucket and reason is nonempty. One assignment per saved place after plan generation, including Unassigned.

Recommendation: `{placeId,verdict,score,headline,text,evidenceStatus,memberEvaluations}`. `headline` and `text` are concise frontend copy. Every trip member appears exactly once in `memberEvaluations` as `{memberId,fit,matchedCriteria,conflicts}`. The generated text attributes matches and tradeoffs to specific members. An ordinary conflict such as budget, distance, or effort lowers fit but does not veto a recommendation; only an explicit firm limit uses `blocked`. Missing research uses `insufficient_information`. Uncertain places may only be `needs_more_information` or `not_recommended`. Person 2 sends `createRecommendationInput(...)` to the model, then passes its structured assessments through `buildGroupRecommendation(...)`; raw provider prose is never returned directly to the frontend.

Trip board: `buildTripBoard(snapshot)` converts normalized snapshot records into `{tripId,title,destination,dateRange,gist,days,ideas}`. Each day is `{date,label,gist,cards}` and `ideas` contains unassigned or not-yet-planned cards. Cards include `{placeId,name,area,sourceReel,brief,verdict,score,headline,text,reason,manual}`. `sourceReel` contains `{importId,url,thumbnailUrl,contributorIds}` so Person 1 can use the original Reel thumbnail as the Pinterest pin image and link the card back to its Reel. A missing thumbnail remains `null`, and missing research receives neutral fallback copy rather than an invented recommendation.

Frontend adapter: `toFrontendTripBoard(board, context)` preserves the board structure and adds a `boardingPass` object to every card. Its fields match Person 1's current `BoardingPassCard`: `{name,summary,location,cost,caveats,label,reason,contributors,reelUrl,counts,mine}`. It also supplies `thumbnailUrl` for the planned Reel-thumbnail enhancement. `context` is `{members,reactions,concerns,currentMemberId?}`. This mapping belongs in shared code so the UI does not duplicate aggregation or recommendation rules.

## Ownership, persistence and concurrency

Person 1: import fixtures into mock hooks now; later swap in the route calls. On manual moves/removals, set `manual:true`, move removals to null date, and renumber destination positions. Submit the full assignment list and last planRevision. On 409, reload and let the user reconcile edits. Explicit replacement confirmation sets replaceManual true; never do this by default.

Person 2: derive identity from your chosen server-verified session, never a request memberId or display name. Check membership and trip scope for every route (join instead validates the private invite). Create organizer membership atomically with trip creation. Hash invite tokens in storage, check expiry/revocation, and do not expose them in GET snapshots. Keep provider keys in backend config. Auth transport, framework and deployment remain team decisions.

On plan writes/generation, validate assignments and atomically compare/increment trips.plan_revision with expectedRevision in the SAME transaction as replacing assignments. Roll back and return 409 if no row matches. Preserve manual assignments during regeneration, including Unassigned removals. Pass is ranking input, not a veto; ordinary concerns do not exclude places. Backend interprets firm limits and passes excludedPlaceIds to the planner. Conflicting/stale manual edits fail validation for explicit resolution.

Database adapters map camelCase to snake_case; JSON fields serialize into *_json columns. Deduplicate imports on (trip_id, normalized_url), preserve contributors in import_contributors, and deduplicate places on (trip_id, identity_key), using a provider ID or reviewed stable identity. Join import_places to retain all sources for a deduplicated place. The raw schema supplies structural constraints; API validators enforce date, membership and plan semantics. Provider spend enforcement and workers remain backend responsibilities.
