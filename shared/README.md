# Person 3 integration kit

Only shared/ is implemented. See [contracts/README.md](contracts/README.md) for the proposed API, wire shapes and teammate handoff.

- contracts/index.js: constants, trip/assignment validation and Reel normalization.
- contracts/fixtures.js: synthetic mock snapshot for frontend hooks.
- utils/itinerary.js: pure deterministic day grouping, area affinity, interest ranking, capacity overflow and preserved manual edits.
- utils/recommendation.js: prepares factual model input, validates per-member assessments, and produces concise group recommendation copy.
- utils/trip-board.js: builds the frontend-ready trip overview, day columns, and unassigned idea cards for a Pinterest-style board.
- database/schema.js: SQLite-compatible schema exported as schemaSql; no service or migration runs automatically.

Run `cd shared && npm test` with Node 22+ (or `node --test shared/tests/*.test.js` from repo root). No install needed. SQLite verification uses Python's standard sqlite3 module via `python3 shared/tests/schema_test.py`.

Three-hour handoff: agree on contracts (0–15 min), build UI and API against the same fixture (15–90), wire storage and planning (90–135), then exercise the acceptance path together (135–180). The handoff path is trip creation, three joins, save a Reel, partial results, interest/concern, generate, manually move, reload on another device. Owners must implement these routes in their directories; this kit does not supply an API, authentication, worker or UI.
