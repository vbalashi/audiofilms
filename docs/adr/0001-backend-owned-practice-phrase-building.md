# Backend-Owned Practice Phrase Building

Accepted.

AudioFilms will build learner-facing `practicePhrases[]` in the backend/app pipeline, while retaining provider/source subtitle units separately as provider phrases. This keeps sentence-first segmentation, timing evidence, cache behavior, degraded-quality metadata, and diagnostics in one place instead of duplicating phrase-building logic between the Next.js app and the no-build YouTube extension.

The YouTube extension should consume backend-produced practice phrases and metadata when available. Extension-only segmentation is allowed only as a temporary fallback for direct page `timedtext` captions that have not yet passed through the backend.

Consequences:

- API contracts should separate provider/source phrases from practice phrases instead of overloading `phrases[]`.
- Display text and timing evidence can come from different sources, but the backend is responsible for exposing that relationship clearly.
- Debug and issue reports should show when phrase boundaries are exact, inferred, projected from ASR timing, or otherwise degraded.
