# Subtitle Practice Contract

This note keeps the web app and the YouTube extension aligned while the extension is still a no-build Chrome spike.

## Shared Shapes

Runtime subtitle fetches return:

- `phrases`: provider/source timed subtitle units with `id`, `startSec`, `endSec`, and `text`.
- `practicePhrases`: backend-owned learner replay/navigation units with `id`, `startSec`, `endSec`, and `text`.
- `language`: actual returned subtitle language when known.
- `meta.provider`: provider that returned the subtitles.
- `meta.sourceKind`: `manual`, `auto`, `provider`, `transcript-panel`, or `unknown`.
- `meta.retrievalPath`: concrete retrieval path, such as `supadata-manual`, `supadata-auto`, `timedtext-json3`, or `backend-provider`.
- `meta.timingExactness`: `exact`, `word-level`, `inferred-end`, or `approximate`.
- `meta.qualityFlags`: machine-readable degraded-quality markers.
- `meta.warnings`: human-readable warnings for UI/debug.
- `meta.retrievalAttempts`: ordered retrieval ladder diagnostics.

The canonical TypeScript definitions live in `app/src/types/subtitles.ts`. The extension mirrors these fields in plain JavaScript until it gets a build step or a shared package.

## Phrase Rules

The app's canonical practice phrase normalizer lives in `app/src/lib/practice/phrases.ts`. API responses should run provider/source `phrases` through this normalizer and return the result as `practicePhrases`.

Current default limits:

- max words per practice phrase: `18`;
- max characters per practice phrase: `140`;
- split on sentence punctuation when available;
- preserve timing by proportionally splitting long source text;
- keep source cue timing when merging short cues.

The extension mirrors these defaults in `extensions/youtube-shadowing/src/phrases.js` only for direct YouTube timedtext/transcript fallbacks. Backend/provider responses should prefer `practicePhrases` and treat `phrases` as provider/source diagnostics or a backward-compatible fallback.

## Ownership

- Subtitle retrieval and provider orchestration stay in the app/backend path.
- The extension may use browser-visible YouTube caption tracks first, but backend/provider fallback should use the same metadata vocabulary as the app.
- Dictionary lookup, saved words, and memory review belong to app/backend providers. The extension should send word, phrase context, language, and subtitle metadata rather than embedding provider logic in YouTube page code.

## Current Gaps

- The extension cannot import the app normalizer yet because it has no bundling step, so direct YouTube timedtext fallback still has a local mirrored phrase builder.
- Provider source-kind fidelity depends on provider support. Supadata and yt-dlp now return manual/auto where detectable; opaque provider results must be marked with `source-kind-unverified`.
- Word tokenization is Unicode-aware in both app practice normalization and extension lookup, but a shared tokenizer module should be introduced before adding richer dictionary behavior.
