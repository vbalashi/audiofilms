# Sentence-First Practice Phrase Boundaries

Status: active planning note, June 16, 2026.

## Goal

Make AudioFilms practice phrases feel like meaningful spoken units rather than arbitrary subtitle chunks.

For the current Dutch fixture:

```text
NQjgLK4HLp0
```

the learner should normally see one complete sentence at a time. If the sentence is too long for one repetition, split it at a natural internal boundary. If two adjacent sentences are both very short, show them together as one practice phrase.

## Current Observation

The extension currently builds practice phrases from timed cues using:

- sentence-ending punctuation;
- pause gaps;
- max duration;
- max words;
- max characters.

The app has a related normalizer that can split text by sentence punctuation, but when there is no internal timing it allocates timing proportionally. That is useful as a readable fallback, but it is not reliable enough for precise shadowing stops.

For `NQjgLK4HLp0`, manual Dutch and auto Dutch currently look very similar because both paths return 139 timed units with nearly identical text and timing:

- manual path: `yt-dlp`, `sourceKind=manual`;
- auto path: `supadata`, `sourceKind=auto`, fallback after `yt-dlp auto` timing quality failed.

This makes the fixture useful for display-text experiments, but not enough by itself to prove that auto timing is better than manual timing.

## Desired Phrase Policy

Use a sentence-first policy:

1. Complete normal-length sentences become one practice phrase.
2. Long sentences split into two or more natural practice phrases.
3. Adjacent very short sentences may be merged into one practice phrase only when the audio gap is short.
4. Phrase boundaries must still have believable audio stop times.
5. When internal timing is guessed rather than measured, mark the phrase timing as approximate/degraded in debug metadata.

The target practice level is intermediate shadowing, not beginner drilling. The default should preserve meaningful sentence-level units when possible instead of chopping speech into very small fragments.

Sentence-first does not mean sentence-at-any-cost. The initial rule should be deterministic:

- preserve a sentence when it is about <= 7 seconds and <= 18 words;
- allow 7-10 second sentences when the text is simple and below the hard word/character caps;
- split 10+ second or 18+ word sentences at the best clause boundary;
- almost always split 12+ second sentences.

## Proposed Terms

These terms are proposed for glossary confirmation before implementation:

- `Practice Phrase`: the unit the learner replays, hides/reveals, and navigates with Previous/Replay/Next.
- `Sentence Unit`: a text unit inferred from punctuation and caption text normalization.
- `Timing Evidence`: the timing source used to place phrase boundaries, such as caption cue boundaries, ASR word timings, or forced alignment.
- `Display Text`: the text shown to the learner, which may come from a cleaner source than the timing evidence.

## Implementation Path

Backend/app owns sentence-first practice phrase building. The extension should consume backend-produced practice phrases and metadata wherever possible, rather than growing a separate browser-only segmentation engine. Temporary extension mirroring is acceptable only for fields still sourced directly from YouTube page timedtext.

### Stage 0: Fixture Evidence

Use `NQjgLK4HLp0` as the first concrete walkthrough.

Collect for manual and auto paths:

- raw provider phrases;
- normalized sentence units;
- current extension practice phrases;
- phrase duration, word count, character count;
- where current boundaries do not match sentence boundaries;
- whether there is any useful ASR word timing available from `yt-dlp` auto for this video.

Exit criteria:

- We can point to exact examples where current phrase boundaries feel wrong.
- We know whether this fixture has word timing evidence or only phrase/cue timing.

### Stage 1: Sentence-First Text Segmentation

Build a shared sentence-first segmenter before changing playback timing.

Rules:

- split on sentence-final punctuation for Dutch and common multilingual punctuation;
- keep abbreviations and numeric punctuation from causing obvious false splits where practical;
- merge short neighboring sentences when combined text stays under limits and the audio gap is short enough not to feel like a deliberate pause;
- split long sentences with deterministic clause-boundary scoring, starting with commas, semicolons, dashes, conjunction-like boundaries, and balanced clause breaks;
- keep a maximum words/characters/duration policy, but make sentence shape the primary rule.

Likely first limits:

- target: 6-14 words;
- short phrase candidate: 1-4 words;
- hard max: 18 words or 140 characters;
- merge short sentences if combined phrase remains <= 12 words and <= 90 characters, the total duration remains about <= 6-7 seconds, and the inter-sentence gap is <= 700-900ms;
- split long sentence if it exceeds 18 words, 140 characters, or about 7 seconds.

Exit criteria:

- `NQjgLK4HLp0` produces readable sentence-shaped practice phrases.
- The app/backend exposes the policy; the extension avoids owning a divergent implementation.

### Stage 2: Timing Without Word Timings

When a sentence boundary lines up with a source cue boundary, use that exact time.

When a sentence must be split inside a cue and no word timing exists:

- estimate timing proportionally by token or character length;
- prefer known pause/cue boundaries if nearby;
- mark `timingExactness=approximate`;
- add a quality flag such as `inferred-boundaries`.

Exit criteria:

- Approximate timing is acceptable only as an experimental degraded fallback.
- Debug/Mark Issue makes guessed boundaries visible.
- It must not be presented as exact timing, even if the source cue itself came from an exact-timed provider.

### Stage 3: ASR Timing As Evidence

When auto captions expose rolling VTT or inline word timestamps:

- parse word timings;
- normalize rolling-caption duplicates;
- build phrase timings from word timestamps;
- use manual display text by default when manual text exists and is readable;
- keep ASR display text only when manual text is unavailable, clearly worse, or mismatched;
- otherwise use ASR timings as timing evidence for cleaner manual display text.

Exit criteria:

- For videos with useful ASR timing, practice stops are better than proportional manual splitting.
- Text quality and timing quality are scored separately.

### Stage 4: Clean Manual Text + ASR Timing Alignment

For videos where manual text is cleaner but poorly timed:

- normalize manual and ASR token streams;
- align tokens with a lightweight dynamic-programming or local-window matcher;
- project ASR word timings onto manual tokens;
- rebuild sentence-first practice phrases from manual display text.
- treat alignment confidence as a hard gate; do not project ASR timings onto manual display text when coverage is too low or local windows are ambiguous.

Exit criteria:

- Alignment coverage is high enough for the relevant sentence windows.
- Low-confidence windows fall back to Stage 1/2 and are marked degraded.

### Stage 5: Backend ASR / Forced Alignment

Only pursue this if cheaper stages fail on important videos.

Options:

- local ASR with word timestamps;
- Whisper/stable-ts-style timestamp refinement;
- forced alignment against clean manual text.

Exit criteria:

- It demonstrably beats Stage 3/4 on stop accuracy or availability.
- The operational cost is justified by target-video quality.

## Data Shape Changes To Consider

Current `Phrase` is only:

```text
id, startSec, endSec, text
```

The API contract should separate source/provider units from learner-facing units:

- `providerPhrases[]` or `sourcePhrases[]`: timed text units returned by the subtitle provider or basic provider parser;
- `practicePhrases[]`: sentence-first replay/navigation units used by the learner;
- existing `phrases[]`: transition field only until callers move to the explicit practice phrase field.

Likely additions, either directly or through metadata:

- phrase boundary confidence;
- timing evidence type;
- display text source;
- sentence ids or source cue ids;
- quality flags for inferred internal boundaries.

Do not expand the runtime contract until Stage 0/1 shows exactly which fields the UI/debug needs.

## Validation

For `NQjgLK4HLp0`, create a small report comparing:

- current phrase list;
- sentence-first phrase list;
- boundary source for each phrase;
- guessed vs exact boundary count;
- longest phrase duration;
- shortest phrase duration;
- examples of merged short sentences and split long sentences.

Then manually dogfood in the extension:

- Replay should stop at natural sentence or clause boundaries.
- Previous/Next should move by meaningful practice units.
- The visible phrase should not become too long for one blind-listening repetition.
- Debug should reveal when timing is approximate.

## Open Questions

1. Should `Practice Phrase` become the canonical name for the replay/navigation unit, distinct from provider `phrases[]`?
2. What is the target learner level for phrase length: beginner, intermediate, or configurable? Answer: intermediate shadowing by default.
3. Should normal-length sentences be preserved even if they exceed the current 12s extension duration guard? Answer: no; preserve sentence shape up to practical intermediate-shadowing limits, then split deterministically by clause.
4. Should two short sentences merge by text length only, or also require a small audio gap? Answer: require a small audio gap; long pauses are meaningful practice boundaries.
5. Is approximate internal timing acceptable in the first iteration if the UI/debug labels it clearly? Answer: yes, as an experimental degraded fallback for dogfooding sentence-first UX.
6. Should clean manual text always win over ASR text when both exist, or can ASR text win if manual timing is much worse? Answer: manual text wins for display by default; ASR text wins only when manual text is unavailable, clearly worse, or mismatched. ASR timing can be projected onto manual display text only when alignment confidence is high enough.
7. Do we want this productized in the backend first, then mirrored in the extension, or can the extension prototype it first? Answer: backend/app first; the extension should consume backend-produced practice phrases and metadata rather than own the segmentation pipeline.
8. Should the API keep overloading `phrases[]`, or separate provider/source phrases from practice phrases? Answer: separate them; `practicePhrases[]` should be the learner-facing replay/navigation list, while provider/source phrases remain available for diagnostics and fallback.
