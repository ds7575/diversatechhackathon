# Initial architecture

## Components

```text
iOS Shortcut / paste page
            |
            v
Mobile web app <----> API <----> Shared database
                         |
                         v
                  Background worker
                    |           |
                    v           v
                 Glasser   Multimodal model
```

The mobile web app owns trip setup, Ideas, Plan, preferences, reactions, corrections, and edits. The API checks membership, persists changes, queues imports, and tracks provider spend. A background worker performs bounded, retryable extraction and research. The database is the shared source of truth.

## Core records

| Record | Purpose |
| --- | --- |
| Trip | Destination, dates, base area, transport, budget, and shared preferences |
| Member | Stable identity, membership, personal preferences, and firm limits |
| Import | Original URL, contributor, normalized identity, status, and errors |
| Place | Confirmed or uncertain match, location, practical details, and brief |
| Evidence | Source URL, retrieved time, and facts supporting a place card |
| Reaction | One member's Interested or Pass response to a place |
| Concern | Price, distance, or effort concern with an optional note |
| Day assignment | Place, day or Unassigned state, position, and explanation |

## Import lifecycle

1. Normalize and save the Reel URL immediately.
2. Deduplicate the import while preserving all contributors.
3. Retrieve approved content and temporary media.
4. Extract candidates from caption, transcript, and sampled frames.
5. Match candidates using destination context.
6. Research confirmed places and retain supporting evidence.
7. Persist each successful place even if another candidate fails.
8. Mark the import Ready, Partially ready, Needs confirmation, or Failed.

## Trust boundaries

- Provider keys live only in backend runtime configuration.
- Every request checks trip membership; display names are not authentication.
- Invite links are private and revocable.
- Temporary media is removed after processing.
- Provider responses and generated plans are validated before persistence.
- Costs are estimated before calls and blocked before exceeding the remaining budget.

## Implementation decisions to record

Before adding application code, choose and document the web framework, API runtime, database, background-job mechanism, deployment target, authentication/session approach, and provider clients. Pin supported provider endpoint versions where possible.

