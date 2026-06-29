# Subtitle Practice Contract

This note keeps the web app and the YouTube extension aligned while the extension is still a no-build Chrome spike.

## Shared Shapes

Runtime subtitle fetches return:

- `phrases`: provider/source timed subtitle units with `id`, `startSec`, `endSec`, and `text`.
- `practicePhrases`: backend-owned learner replay/navigation units with `id`, `startSec`, `endSec`, and `text`.
- `practicePhrases[].text`: the replay/navigation text for the current practice unit.
- `practicePhrases[].displayText`: optional full sentence shown to the learner when
  replay/navigation operates over a shorter segment inside that sentence.
- `practicePhrases[].displayStartChar` and `displayEndChar`: optional character
  range of the replay segment inside `displayText`; the extension uses this to
  highlight the practiced part while keeping the full sentence visible.
- `practicePhrases[].translationText`: optional text that should be translated
  for Recall/Show Translation. For segmented sentence replay, this is the full
  sentence, not the short replay segment.
- `language`: actual returned subtitle language when known.
- `meta.provider`: subtitle provider that returned the subtitles when a provider was used, such as Supadata. Do not use this field as the learner-facing source label.
- `meta.sourceKind`: `manual`, `auto`, `provider`, `transcript-panel`, or `unknown`.
- `meta.retrievalPath`: diagnostic retrieval path, such as `supadata-manual`, `supadata-auto`, `timedtext-json3`, or a backend/orchestrated path. This is debug/details language, not the default learner-facing label.
- `meta.timingExactness`: `exact`, `word-level`, `inferred-end`, or `approximate`.
- `meta.qualityFlags`: machine-readable degraded-quality markers.
- `meta.warnings`: human-readable warnings for UI/debug.
- `meta.retrievalAttempts`: ordered retrieval ladder diagnostics.

The canonical TypeScript definitions live in `app/src/types/subtitles.ts`. The extension mirrors these fields in plain JavaScript until it gets a build step or a shared package.

The redesign target adds a product-facing layer above these technical fields:

- `Text Source`: user-visible labels such as `Dutch`, `Dutch (auto-generated)`, and `ASR transcript`.
- `Timing Evidence`: cue timing, approximate split timing, auto-caption timing, ASR word timing, or aligned timing.
- `Practice Readiness`: `No captions`, `Rough`, `Ready`, `Precise`, or `Improving...`.
- User-initiated actions: `Get Captions` and `Improve Timing`.

These terms are defined in `CONTEXT.md` and expanded in `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`.

## Phrase Rules

The app's canonical practice phrase normalizer lives in `app/src/lib/practice/phrases.ts`. API responses should run provider/source `phrases` through this normalizer and return the result as `practicePhrases`.
Practice snapshots also re-run this normalizer over cached/backend-owned
`practicePhrases` before exposing a `phraseSet`, so old ASR timing artifacts do
not bypass current phrase length and ellipsis-continuation rules.

Current default limits:

- max words per practice phrase: `18`;
- max characters per practice phrase: `140`;
- split on sentence punctuation when available;
- preserve timing by proportionally splitting long source text;
- keep source cue timing when merging short cues.

When a long sentence is split for replay, the backend should keep the split
segments short enough for shadowing but preserve the full sentence in
`displayText` and `translationText`. This applies to continuation chains of two
or more caption parts, not only pairs. This is the `Segmented Sentence Replay`
case from `CONTEXT.md`: the learner sees enough context for comprehension and
translation, while `Replay`, `Previous`, `Next`, and highlighting still operate
on the shorter timed segment.

The extension mirrors these defaults in `extensions/youtube-shadowing/src/phrases.js` only for direct YouTube timed text/transcript fallbacks. Backend responses should prefer `practicePhrases` and treat `phrases` as provider/source diagnostics or a backward-compatible fallback.

## Ownership

- Subtitle retrieval and provider orchestration stay in the app/backend path.
- The extension may use browser-visible YouTube caption tracks first, but backend-orchestrated fallback should use the same metadata vocabulary as the app.
- Dictionary lookup, saved words, and memory review belong to app/backend providers. The extension should send word, phrase context, language, and subtitle metadata rather than embedding provider logic in YouTube page code.
- The extension should not render `manual`, `exact`, `cached`, `yt-dlp`,
  `timedtext`, or `provider` as default learner-facing labels. Those belong in
  details/debug. If a non-ASR text source uses ASR/aligned timing, the closed
  selector may add only the compact enrichment, for example `Dutch · ASR timing`.

## Current Gaps

- The extension cannot import the app normalizer yet because it has no bundling step, so direct YouTube timedtext fallback still has a local mirrored phrase builder.
- Provider source-kind fidelity depends on provider support. Supadata and yt-dlp now return manual/auto where detectable; opaque provider results must be marked with `source-kind-unverified`.
- Word tokenization is Unicode-aware in both app practice normalization and extension lookup, but a shared tokenizer module should be introduced before adding richer dictionary behavior.
- Practice readiness, `Get Captions`, `Improve Timing`, Recall Mode phrase translation, and Recall reverse lookup need explicit backend/UI contracts before full implementation.
