# Subtitle Source Quality Shootout

Status: active planning note, June 11, 2026.

## Goal

Find the cheapest reliable subtitle pipeline that still gives AudioFilms high-quality shadowing phrases: sentence-like text, accurate phrase boundaries, stable source switching, and clear degraded states.

The user experience goal is not "show whatever transcript is easiest to fetch." The goal is:

- show readable phrases of manageable length;
- stop playback on phrase boundaries that match the audio;
- avoid overlapping or rolling-caption artifacts;
- make source quality and provider origin visible in debug, but invisible to normal learners unless there is a problem.

## Why Supadata Is Primary Today

The current code default is:

```text
DEFAULT_SUBTITLE_PROVIDER = "supadata"
```

This is a historical integration choice, not a proven product decision. Supadata was useful because it returns a simple structured API response and was faster to integrate than building robust YouTube caption extraction ourselves.

It has real costs and risks:

- the free tier is limited;
- normal smoke tests can spend API quota unless cached;
- it can return the same transcript for manual and auto requests while labeling them differently;
- it can fail on videos that browser-visible YouTube captions expose;
- provider region/client behavior can differ from the user's browser.

Current pragmatic position:

1. Prefer free/local/page-derived sources when they are reliable and source-specific.
2. Use paid APIs when they materially improve availability or quality.
3. Make provider origin visible in Debug and Mark Issue so decisions are evidence-based.
4. Do not let a paid provider hide source mismatch or degraded timing.

Current answer after the first cached fixture shootout:

- Supadata should not be the assumed primary source.
- The primary product path should become source-quality selection:
  1. try browser/page-visible YouTube tracks when available;
  2. prefer manual captions when they are already phrase-sized;
  3. prefer normalized `yt-dlp` auto captions when manual captions are too long for shadowing;
  4. show a no-captions state when YouTube exposes no usable track;
  5. call paid providers only as an explicit fallback or shootout candidate.
- Supadata remains valuable if it beats YouTube/`yt-dlp` on availability or clean segmentation, but that must be measured with `npm run subtitle:shootout:supadata`, not consumed by default tests.

## Current Retrieval Candidates

| Candidate | Cost | Strength | Weakness | Best Role |
| --- | --- | --- | --- | --- |
| YouTube page `timedtext` from browser-visible caption track | Free | Most likely to match what the user can select in YouTube UI | Can return empty in extension/browser context; YouTube internals change | First attempt when it works |
| `yt-dlp` manual subtitles | Free/local | Can discover and fetch manual tracks outside the page | Can need YouTube access workarounds; server-side dependency | Backend/local fallback and diagnostics |
| `yt-dlp` auto captions / rolling VTT | Free/local | Can expose ASR `kind=asr` tracks and word-level VTT markers | Rolling captions need custom normalization | Main candidate for ASR/word-timing experiments |
| Supadata | Paid API after free tier | Simple structured response; quick integration | Quota/cost; can collapse manual/auto distinction; provider-region differences | Paid fallback or provider shootout candidate |
| SerpApi / other transcript APIs | Paid or trial | May return sentence-like chunks and cache hits | Availability varies by video/provider; may infer end times | Shootout candidates before custom ASR |
| Forced alignment / ASR backend | Compute cost | Can align clean text to audio when captions are poor | Requires audio access, language models, and backend jobs | Later quality path for important videos |

## Diagnostic Fixture

Video:

```text
RJrjzCuCHpo
```

Observed on June 11, 2026:

- YouTube/yt-dlp exposes manual Dutch `nl`.
- YouTube/yt-dlp exposes auto Dutch `nl` / `nl-orig`.
- Manual Dutch has `138` cues and one `22.28s` cue.
- Auto Dutch rolling VTT has about `384` cue blocks and no >12s cue in the raw parsed sample.
- Supadata returned the same `138` cue transcript for both manual and auto API requests.

Implication:

- manual long cues are textually useful but poor for stopping;
- ASR rolling captions are more promising for timing, but need rolling-caption normalization;
- provider metadata alone is not enough. We must compare cue shape and source origin.

## Research Baseline

Primary/project sources checked:

- W3C WebVTT spec: https://www.w3.org/TR/webvtt1/
- MDN WebVTT format notes: https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format
- WebM WebVTT notes on overlapping roll-up captions: https://wiki.webmproject.org/webm-metadata/temporal-metadata/webvtt-in-webm
- Montreal Forced Aligner docs: https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/index.html
- aeneas project/docs: https://github.com/readbeyond/aeneas and https://www.readbeyond.it/aeneas/docs/
- stable-ts project: https://github.com/jianfch/stable-ts

Key takeaways:

- WebVTT cues are timed text intervals; rolling captions can overlap and repeat displayed text.
- YouTube ASR VTT can contain intra-cue timestamp markers such as `<00:00:10.759><c>word</c>`, which are valuable for word timing.
- Forced alignment is a separate backend class: it aligns known text to audio using acoustic/language resources.
- Forced alignment is a candidate for aligning clean manual captions to audio, but it needs audio access and language-specific tooling.

## Experiment Track A: Provider Cost And Reliability

Question:

Can we make `yt-dlp` or page-derived YouTube caption extraction the default and reserve Supadata for fallback?

Tests:

1. Build a fixture runner that queries the same video/source through:
   - page timedtext when available;
   - backend `yt-dlp` manual;
   - backend `yt-dlp` auto;
   - Supadata manual;
   - Supadata auto.
2. Measure:
   - success/failure;
   - provider origin;
   - source kind match;
   - cue count;
   - long cue count;
   - duplicate/overlap/rolling flags;
   - rough latency;
   - whether manual and auto responses are actually different.
3. Run against:
   - `RJrjzCuCHpo` manual/ASR divergence;
   - `4EE7m94mJpk` normal manual;
   - `xymyDvCgWDA` auto-only;
   - `EColTNIbOko` no captions;
   - `KrdVIUmBoE4` provider fallback/geography stress;
   - one multilingual manual video.

Exit criteria:

- We can justify provider order with data, not preference.
- Smoke tests do not burn paid quota by default unless explicitly configured.
- Debug always shows provider origin and whether the selected YouTube source was actually honored.

Current fixture recommendation from the safe cached runner:

| Fixture | Recommended source | Confidence | Meaning |
| --- | --- | --- | --- |
| `RJrjzCuCHpo` | `yt-dlp-auto` | medium | Manual text exists but is too long; ASR rolling captions currently stop better. |
| `4EE7m94mJpk` | `yt-dlp-manual` | high | Manual captions are good enough for shadowing. |
| `xymyDvCgWDA` | `yt-dlp-auto` | low | Auto-only works, but rolling cleanup still leaves artifacts. |
| `EColTNIbOko` | none | high | Correct no-captions empty state; do not waste paid retries during normal playback. |
| `KrdVIUmBoE4` | `yt-dlp-manual` | high | Manual captions are usable; ASR rolling version is worse right now. |
| `aircAruvnKk` | `yt-dlp-manual` | high | Manual English is usable; auto is optional. |

## Experiment Track B: Manual Long-Cue Splitting

Question:

Can long manual/editorial cues be split into usable phrases without word-level timing?

Hypothesis:

Manual text is often cleaner than ASR, but if a cue is too long and has no internal timing, any split timing is approximate. It may be acceptable as a degraded fallback, not as the best shadowing experience.

Variants:

1. Split by sentence punctuation within the cue.
2. If still too long, split by commas or conjunction boundaries.
3. Allocate time proportionally by character or word count.
4. Mark output as approximate timing and degraded.

Risks:

- pauses may not match speech;
- punctuation may be absent or editorial;
- proportional timing can feel wrong for shadowing.

Exit criteria:

- Long manual cue split can be used only when no better timed source exists.
- UI/debug labels it as approximate/degraded.

## Experiment Track C: Rolling Caption Normalization

Question:

Can YouTube ASR rolling captions be converted into clean phrase units with accurate enough timings?

Hypothesis:

This is the most promising path for videos like `RJrjzCuCHpo` because ASR rolling VTT includes more frequent timing and sometimes word-level markers.

Variants:

1. Parse raw rolling VTT cues and remove repeated prefix text.
2. Extract word-level timestamp markers when present.
3. Rebuild phrases from words using:
   - punctuation when available;
   - max duration;
   - max words/characters;
   - pause gaps;
   - fallback split by rhythm when punctuation is absent.
4. Preserve original ASR text quality warnings separately from timing quality.

Exit criteria:

- `RJrjzCuCHpo` auto Dutch yields shorter, non-overlapping phrase units.
- Phrase timing follows the ASR word/cue timings, not proportional guesses.
- Output is visibly better than manual long-cue splitting for shadowing.

## Experiment Track D: Clean Text With ASR Timing

Question:

Can we show clean manual/editorial text while stopping audio using ASR word timings?

Hypothesis:

This could produce the best user experience when manual text is clean but poorly timed and ASR timing is detailed but text is noisier.

Possible approaches:

1. Lightweight text alignment:
   - normalize manual and ASR text;
   - align token sequences with dynamic programming;
   - project ASR word timings onto matched manual tokens.
2. Backend forced alignment:
   - use manual transcript and audio;
   - run a forced aligner such as MFA or aeneas;
   - return word/phrase timestamps.
3. ASR regeneration:
   - transcribe with a model/tool that returns word timestamps;
   - optionally align manual text afterward.

Risks:

- requires audio access;
- requires backend jobs, not browser-only logic;
- language/model support matters;
- alignment failures can be subtle.

Exit criteria:

- Prototype on one Dutch video demonstrates better phrase stops than raw manual cues and better text than raw ASR.
- Failure mode is explicit and falls back to rolling-caption normalization or manual degraded split.

## Next Project: Rolling And Alignment Quality

Treat this as a separate product-quality project, not a quick patch in the extension.

Working hypothesis:

- For many videos, manual captions are the best display text.
- For some videos, automatic captions are the best timing source because they expose denser cue timing or inline word markers.
- The ideal output may be "show manual-quality text, stop using ASR timing."

Proposed experiment variants:

1. Rolling ASR cleanup only:
   - normalize YouTube auto-caption VTT;
   - remove repeated rolling text;
   - split by punctuation, max duration, word count, character count, and pause gaps;
   - use this directly when manual captions are absent or unusably long.
2. Manual long-cue degraded split:
   - split long manual cues by sentence/punctuation;
   - assign approximate timings proportionally;
   - mark as degraded because stops will not be exact.
3. Clean text aligned to ASR timing:
   - tokenize manual and ASR text;
   - align token sequences;
   - project ASR word timings onto matching manual tokens;
   - use backend processing if browser-only logic becomes fragile.
4. Forced-alignment backend:
   - fetch audio;
   - align manual transcript to audio with a dedicated aligner;
   - use only if simpler ASR timing projection is not good enough.

Decision rule:

- browser/extension should stay responsible for playback and lightweight diagnostics;
- backend should own provider policy, paid calls, cache, rolling normalization, and alignment experiments;
- runtime should never spend paid quota during ordinary smoke tests or local iteration unless explicitly requested.

## Browser Vs Backend Boundary

Do in browser/extension:

- source discovery from the current YouTube page;
- light parsing/debug display;
- playback control;
- UI.

Do in backend:

- `yt-dlp` extraction;
- paid provider calls;
- rolling-caption normalization once it becomes non-trivial;
- forced alignment / ASR / audio processing;
- cache and quota control.

Reason:

Quality processing should be testable, cacheable, and quota-aware. The extension should not become the place where provider policy, paid API usage, and heavy text/audio alignment logic live.

## Proposed Next Milestone

Build a provider/normalization lab script before changing default product behavior.

Deliverables:

1. Fixture matrix for the videos above.
2. One command that prints provider/source comparisons.
3. Cached artifacts so repeated tests do not spend paid quota unnecessarily.
4. First rolling-caption parser for `yt-dlp` ASR VTT.
5. Report comparing:
   - Supadata manual/auto;
   - yt-dlp manual;
   - yt-dlp auto rolling normalized;
   - manual long-cue split.

Only after this should we change default provider order or product UI behavior.

## First Lab Result

Command:

```bash
cd app
npm run subtitle:shootout
```

This command intentionally does not call Supadata. It uses `yt-dlp` and local cached artifacts so repeated runs do not spend paid API quota.

Use `--refresh` sparingly. A refresh run on June 11, 2026 hit repeated YouTube HTTP `429` responses while fetching timedtext URLs. The normal cached run recovered immediately from local artifacts. This confirms that even "free" YouTube/yt-dlp retrieval needs cache-first behavior.

Report:

```text
docs/exec-plans/active/subtitle-source-quality-shootout-report.md
```

Initial findings:

- `RJrjzCuCHpo` manual Dutch via `yt-dlp` has `138` cues, one `22.28s` long cue, and is poor for shadowing stops.
- `RJrjzCuCHpo` auto Dutch via `yt-dlp` has `384` raw rolling VTT cues and the first rolling normalizer produced `187` shorter non-overlapping cues with max duration about `4.95s`.
- The rolling normalizer is useful evidence but not product-ready. It reconstructs the start of the transcript correctly and removes overlaps for the key fixture, but other fixtures still show duplicate-text and occasional long-cue artifacts.
- `xymyDvCgWDA` confirms auto-only videos can be fetched through `yt-dlp` without Supadata.
- `EColTNIbOko` correctly stays no-caption through both manual and auto paths.
- `KrdVIUmBoE4` manual can be fetched through `yt-dlp` in the lab, which supports testing a cheaper/free fallback path before paying for provider calls.

Immediate conclusion:

Do not change product defaults yet. The next implementation step should improve rolling-caption normalization by removing duplicate text artifacts and splitting remaining long ASR phrases, then compare against Supadata only with an explicit `npm run subtitle:shootout:supadata` run when quota use is acceptable.
