# API and worker

Owner: Person 2. All API routes, provider clients, background jobs, backend tests, and backend-specific configuration belong here.

Reserved for authenticated trip access, import processing, research orchestration, place matching, recommendation generation, spend tracking, and background jobs.

The current backend code is a standalone Instagram extraction module and CLI; no HTTP API or framework has been selected. Use contracts defined by Person 3 in `shared/` when connecting it to the app. Provider credentials must remain server-side.

## Minimal Instagram extraction

Run `node backend/bin/extract-instagram.js 'https://www.instagram.com/p/Demqe5ltfbs/'` from the repository root. The reusable `extractInstagram(url)` function is in `src/services/instagram-extract.js`. It uses the locally authenticated Glasser CLI; a server can instead provide `GLASSER_API_KEY` through its private environment. Never pass the key to the CLI entry point or commit it.

The selected endpoint is ScrapeCreators `/v1/instagram/post` through Glasser, pinned to version 2. Its required input is `url`; this integration sends the canonical Instagram URL with `trim: false` and `include_play_count: false`. The inspected price was $0.00188 per call, including no-result responses. The documented provider shape has `data.xdt_shortcode_media`, whose `__typename` identifies an image, video, or carousel; caption text is in `edge_media_to_caption.edges[].node.text`. Glasser publishes no formal output schema for this endpoint, so the module retains the provider response after removing all comment fields and handles missing fields conservatively. The source is [ScrapeCreators' post/reel documentation](https://docs.scrapecreators.com/v1/instagram/post/).

Before a paid Run, the module calls `glasser inspect` and `glasser balance` and rejects a changed version or non-flat price, insufficient available balance, or a projected cost above the $9 project limit. It uses a stable idempotency key and a local URL cache to avoid another charge for the same post. Original URLs, comment-free provider responses, results, and charges are stored under the ignored `backend/.data/instagram/` directory with private file permissions. Keep that directory private if deploying the backend.

The provider may return comments, and Glasser's own Run page may display them. The backend removes all comment fields before caching or extraction. The extraction input and returned result contain only the post caption, any transcript, and any on-screen text supplied by the provider. Comment fields never enter the extractor or CLI display and are never used as place evidence. Lines explicitly marked with `📍`, `Place:`, `Location:`, or `Venue:`, emoji-led place labels followed by a colon, and a few explicit place phrases become uncertain candidates with source quotes. Scenery alone never creates a place candidate.

The backend does not download or inspect video, run OCR, or transcribe audio. Across the four tested Reels, this provider returned captions but no transcripts or on-screen text. Use this path when the caption itself names the places; a Reel that identifies its attraction only in the video can produce no candidate.

### Reel input guidance

- Use a public Instagram post or Reel permalink accessible to the provider. A `/p/` URL can still contain a Reel; the extractor checks the returned media type.
- For one main attraction, put its name directly in the caption, ideally on its own line: `📍Cala Mitjana, Menorca, Spain` or `Place: Cala Mitjana, Menorca, Spain`.
- For a multi-place Reel, give each place a labeled line such as `🏰 Granada: Historic center and Alhambra`. The extractor returns all named places; it does not decide which one is featured most prominently.
- Avoid relying on scenery, spoken names, music, hashtags, or text visible only in the video. This integration does not analyze them. Across the four tested Reels, captions were returned for all four, but transcripts and provider on-screen text were returned for none.
- Keep captions specific. A generic caption or hashtag-only list can leave `candidates` empty. Side mentions in a caption can also become uncertain candidates, so downstream users should review the source quote before treating one as the main attraction.
- Candidates are text mentions, not verified map places. The current extractor does no geocoding or independent place verification.

An uncached URL is blocked before Glasser access unless the caller passes `allowPaidRun: true` or the CLI receives `--approve-paid-call`. Obtain the user's approval before using either option. Run local checks with `node --test backend/test/instagram-extract.test.js`.
