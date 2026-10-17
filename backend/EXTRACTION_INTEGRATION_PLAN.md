# Instagram extraction to recommendation plan

This plans the backend worker against the current shared SQLite schema and contracts, including `adaptInstagramExtraction(...)` added in shared commit `5c13423`. It does not change shared files or make provider calls. The prototype assumption is that members submit group-relevant Reels, so every extracted candidate proceeds directly to one destination-scoped place search rather than a member confirmation flow.

## Data path

`public URL → imports → comment-free Glasser text → shared import adapter → Google/place search → confirmed place + research → per-member evaluation → recommendation`

| Extractor value or stage | Existing storage | Rule |
| --- | --- | --- |
| Canonical URL and processing state | `imports.normalized_url`, `status`, `error_code` | Insert before processing; `UNIQUE(trip_id, normalized_url)` prevents duplicate import work within a trip. Keep the original submitted URL in the private extraction cache. |
| Member who submitted the URL | `import_contributors` | A duplicate import adds this member to the existing import. Never discard earlier contributors. |
| Caption-derived candidate | `places` plus `import_places` | `adaptInstagramExtraction(...)` creates the initial place record and link. The worker immediately enriches it from the first usable destination-scoped place-search result. |
| Caption quote supporting the candidate | `evidence.source_url`, `retrieved_at`, `facts_json`, `source_kind`, `source_path`, `timestamp_seconds` | The adapter preserves the exact quote and source. Persist these fields; do not store comments or treat the quote as independent research. |
| Matched place and researched facts | `places.identity_key`, `match_status`, `area`, coordinates, `brief`, `practical_json`; additional `evidence` rows | Fill these from the place-search result and its research. Set `match_status='confirmed'` when a usable result is returned. Use null or `{}` for facts the search does not establish. Multiple imports may link to one verified place. |
| Group recommendation | `recommendations`, `member_place_evaluations` | Build from the confirmed place, researched evidence, and all members' criteria. The required numeric score is internal; do not display it as a match percentage. |

For this prototype, build the search query as `<candidate name> <caption location context> <trip destination>`. Take the first usable Google/place-search result, use its provider place ID as `identity_key`, and set the place to `confirmed`. The original Reel quote remains separate evidence showing why the group saved it; research evidence explains what the real-world place is. If the search returns no usable result, retain the initial uncertain record and mark the import `partially_ready` rather than losing candidates that succeeded.

## Worker boundary

1. Accept a public Instagram permalink, normalize it, insert or reuse `imports`, and record the contributor. Return the import immediately with `queued` status.
2. Move to `processing`, call the existing backend extractor once for the canonical URL, and use only `extraction.sources`, `candidates`, and `uncertainties`. The private cache already prevents duplicate paid calls and excludes comment fields.
3. Pass the extractor result through `adaptInstagramExtraction(...)` and persist its import, candidate places, import-place links, and Reel evidence. No candidate means `failed` with `no_explicit_place`; provider failure also means `failed`.
4. For each candidate, issue one Google/place-search query using the candidate, optional caption context, and trip destination. Update the candidate place in place: provider ID → `identity_key`; returned name → `name`; locality → `area`; coordinates → `latitude` and `longitude`; `match_status` → `confirmed`. Store retrieved research as additional evidence rows. Set the import to `ready` if every candidate was enriched, otherwise `partially_ready`.
5. For every confirmed place, create the factual input with `createRecommendationInput(...)`, using research evidence but excluding the Reel-mention quote. Have the model return only per-member `fit`, `matchedCriteria`, and `conflicts`; run `buildGroupRecommendation(...)` and its validator before saving the recommendation and one evaluation per member. Do not pass raw provider output or comments to the model.

Caption context such as “Menorca, Spain” is search context only. A Reel naming several places creates several confirmed place cards after their searches; the prototype does not attempt to decide which one occupied the most screen time. Hashtag-only or scenery-only Reels still fail cleanly because the extractor produces no candidate to search.

## Exact persistence sequence

The route needs only `tripId`, the authenticated `memberId`, and `{url}`. The worker owns all provider calls and database writes after the route returns.

1. In one short transaction, insert `imports` with `status='queued'`, insert `import_contributors`, and return the import. If `UNIQUE(trip_id, normalized_url)` finds an existing import, insert only the missing contributor row and return that import without another extraction call.
2. Set the import to `processing`. Run `extractInstagram(normalizedUrl)`.
3. Call `adaptInstagramExtraction({ tripId, contributorId: memberId, importId, result, retrievedAt })`. For each returned candidate, insert a `places` row, its `import_places` row, and its Reel-quote `evidence` rows. Map `facts` to `facts_json`, `source` to `source_kind`, `sourcePath` to `source_path`, and `timestampSeconds` to `timestamp_seconds`.
4. Search the candidate. Update that same `places` row with the returned provider ID, canonical name, locality, coordinates, brief, practical details, and `match_status='confirmed'`. Insert separate research evidence rows with the search or source URL and only facts actually returned by research.
5. Read the confirmed place, trip members, and research evidence. Pass them to `createRecommendationInput`. Persist the returned group recommendation in `recommendations` and replace that place's `member_place_evaluations` in the same transaction.
6. Set `imports.status` to `ready` when every candidate has a confirmed place and recommendation, `partially_ready` when at least one succeeds, or `failed` when extraction produces none or every downstream search fails. Keep the candidate rows and their Reel evidence in all partial cases.

The model boundary is deliberately narrow:

```json
{
  "place": { "id": "place-42", "name": "Cala Mitjana", "matchStatus": "confirmed", "area": "Menorca", "brief": "…", "practical": {} },
  "members": [{ "memberId": "member-1", "criteria": {}, "firmLimits": {} }],
  "evidence": [{ "facts": ["Research fact"], "sourceUrl": "https://…", "retrievedAt": "2026-10-17T00:00:00Z" }]
}
```

The original Instagram caption quote stays in `evidence` for source traceability, but is excluded from that AI input. That keeps the recommendation grounded in research while the UI can still show the Reel that inspired it.

## Shared-contract status and remaining decisions

1. **URL gate resolved:** shared commit `5c13423` accepts `/p/`, `/reel/`, `/reels/`, and `/tv/` URLs. The provider's media metadata still determines whether a `/p/` URL is a Reel.
2. **Evidence provenance mostly resolved:** the shared schema now has `source_kind`, `source_path`, and `timestamp_seconds`, and the adapter supplies matching wire fields. The backend should treat `caption`, `transcript`, and `on_screen_text` as Reel mentions and pass only separately researched evidence kinds into `createRecommendationInput(...)`. Agree on a small allowed-kind convention with the shared owner; the database currently allows null or arbitrary values.
3. **Candidate identity and area:** the adapter's initial `identityKey` and `area` are temporary extraction values. The worker overwrites both from the search result before any card or recommendation uses them.
4. **Database target unresolved:** `shared/database/schema.js` and its tests define SQLite, while `CLAUDE.md` says Supabase Postgres. Choose the deployment database before writing the persistence adapter; the table mapping above remains the intended logical model.
5. **Thumbnail:** `imports.thumbnail_url` exists, but the extractor's public result does not expose a safe thumbnail field yet. Add that backend metadata only if the board needs the Reel image; do not expose the raw provider response.
6. **Spend ledger:** the schema has no `spend` table despite the project instruction to log paid calls. The current private cache records charges, but a deployed worker needs one durable ledger and budget gate shared across instances.

The backend can now use the shared adapter for the first half of the pipeline. The only implementation decision still needed before writing the worker is which place-search provider and database adapter to use; frontend work can continue against the existing snapshot contract without touching extractor internals.
