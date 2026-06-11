# Rolling Caption And Alignment Quality

Status: active planning note, June 11, 2026.

## Goal

Find the simplest caption-processing layer that gives a good shadowing experience:

- readable phrase-sized text;
- stable non-overlapping timings;
- phrase stops that feel tied to the audio;
- no paid API or model work unless simpler processing is not good enough.

The stopping rule is explicit: once a cheaper stage produces acceptable phrase quality on the fixture set, stop and productize that stage before moving to heavier backend/model work.

## Current Evidence

Safe cached command:

```bash
cd app
npm run subtitle:shootout
```

This command does not call Supadata.

Current report:

```text
docs/exec-plans/active/subtitle-source-quality-shootout-report.md
```

First clean-text/ASR-timing feasibility result:

| Fixture | Result | Meaning |
| --- | --- | --- |
| `RJrjzCuCHpo` | high candidate, manual coverage `0.779`, ASR coverage `0.86` | Try lightweight token alignment before any model. |
| `4EE7m94mJpk` | medium candidate, manual coverage `0.715`, ASR coverage `0.912` | May work with better normalization/local matching. |
| `xymyDvCgWDA` | not applicable | Auto-only; needs rolling cleanup, not clean-text alignment. |
| `EColTNIbOko` | not applicable | No captions. |
| `KrdVIUmBoE4` | high candidate, manual coverage `0.803`, ASR coverage `0.784` | Try lightweight token alignment. |
| `aircAruvnKk` | high candidate, manual coverage `0.877`, ASR coverage `0.987` | Strong alignment candidate. |

Implication:

- Rolling cleanup is needed for auto-only or bad-manual videos.
- Clean manual text plus ASR timing is worth testing before forced alignment.
- Backend/model alignment is not justified yet as the first move.

First Stage 1 cleanup result:

| Fixture | Before | After | Meaning |
| --- | ---: | ---: | --- |
| `xymyDvCgWDA` auto-only | `10.76s` max phrase | `4.23s` max phrase | Simple word-duration bounding makes ASR usable enough to continue without models. |
| `KrdVIUmBoE4` auto | `14.71s` max phrase | `4.639s` max phrase | Rolling VTT can be cleaned cheaply, although manual remains the better display source. |
| `4EE7m94mJpk` auto | `7.35s` max phrase | `4.6s` max phrase | Auto timing becomes cleaner, but manual is already good enough. |

Remaining Stage 1 gap:

- duplicate-text flags remain on several ASR outputs;
- some longest-cue text still shows ASR artifacts such as `[Muziek]` or mixed-language snippets;
- this is good enough to justify continuing Stage 1 before jumping to backend forced alignment.

## Research Baseline

Sources checked:

- W3C WebVTT: https://www.w3.org/TR/webvtt1/
- YouTube automatic captions help: https://support.google.com/youtube/answer/6373554
- Montreal Forced Aligner user guide: https://montreal-forced-aligner.readthedocs.io/en/v3.1.0/user_guide/
- stable-ts: https://github.com/jianfch/stable-ts
- Forced-alignment comparison paper: https://arxiv.org/html/2406.19363v1

Relevant takeaways:

- WebVTT is timed text. It is a good interchange format, but it does not guarantee phrase quality.
- YouTube automatic captions are machine-generated and can vary in transcription quality, so they are better treated as timing evidence than trusted display text when manual captions exist.
- Forced alignment aligns transcript text to audio and is a backend/model class of work.
- MFA can be strong for alignment quality, but requires audio, language resources, and operational setup.
- stable-ts/Whisper-style tooling can align or refine word timestamps, but it also requires audio and model execution.

## Stage 0: Source Quality Gate

Runtime decision:

1. Prefer manual captions when they are already phrase-sized.
2. Prefer normalized ASR rolling captions when manual captions are unusably long.
3. Use no-captions state when no usable YouTube source exists.
4. Do not call Supadata or model backends during normal smoke tests.

Stop condition:

- If manual captions are phrase-sized on target videos, no rolling/alignment work is needed for those videos.

Current status:

- Done in the shootout report.

## Stage 1: Browser-Safe Rolling Cleanup

Scope:

- Parse auto-caption VTT.
- Extract inline word timestamps when present.
- Remove repeated rolling text.
- Build non-overlapping phrases using:
  - punctuation;
  - max duration;
  - max words;
  - max characters;
  - pause gaps;
  - fallback rhythm split when punctuation is absent.

Where it can run:

- The algorithm itself can run in browser JavaScript.
- Product policy and caching should still live behind the backend once it stabilizes.

Quality target:

- no overlaps;
- no exact duplicate phrases except intentional repeated speech;
- max phrase duration normally <= `6s`;
- most phrases <= `12` words and <= `90` characters;
- no visible rolling-caption residue.

Stop condition:

- If this produces good phrases for auto-only and bad-manual fixtures, productize it before doing clean-text alignment.

Known current gap:

- `xymyDvCgWDA` max phrase is now `4.23s`, but duplicate text and `[Muziek]` artifacts remain.
- `KrdVIUmBoE4` auto max phrase is now `4.639s`, but duplicate text and ASR quality artifacts remain.

## Stage 2: Lightweight Clean Text + ASR Timing

Scope:

- Keep manual captions as display text.
- Use ASR word/cue timings as timing evidence.
- Normalize both text streams.
- Align token sequences with dynamic programming or local-window matching.
- Project ASR timings onto matched manual tokens.
- Rebuild phrase boundaries from the manual text.

Where it can run:

- Prototype can run in Node/browser JavaScript.
- If it becomes a product feature, backend is preferable for cacheability and diagnostics.

Quality target:

- display text matches manual captions;
- phrase timing follows ASR timing;
- alignment coverage >= `0.72` for both streams, or local windows are explicitly marked degraded;
- fallback to Stage 1 or manual degraded split when alignment confidence is low.

Stop condition:

- If `RJrjzCuCHpo` gets readable manual text with accurate enough stops, this is probably enough for the next product iteration.

## Stage 3: Manual Long-Cue Degraded Split

Scope:

- Split long manual captions by sentence punctuation.
- If still too long, split by commas or conjunctions.
- Allocate timing proportionally by words/characters.
- Mark timing as approximate.

Where it can run:

- Browser or backend.

Quality target:

- readable text;
- no giant subtitle blocks;
- clear degraded label in debug because stop timing is guessed.

Stop condition:

- Use only when no ASR timing is available or ASR matching is poor.

## Stage 4: Backend Forced Alignment

Scope:

- Fetch or receive audio.
- Use manual transcript as source of truth.
- Run an aligner such as MFA or stable-ts/Whisper alignment.
- Return word/phrase timestamps.

Where it must run:

- Backend/job worker.

Why not first:

- Requires audio access, model/tool installation, caching, language support, and failure handling.
- It may become the best quality path, but it is not the cheapest path to test.

Quality target:

- better than Stage 2 on the same fixtures;
- measurable improvement in stop accuracy, not just cleaner architecture.

Stop condition:

- Only build this if Stages 1-2 fail on important videos.

## Next Implementation Step

Continue Stage 1 rolling cleanup before changing runtime behavior:

1. Classify duplicate-text flags into consecutive duplicates vs legitimate repeated speech.
2. Filter or label non-speech bracket tokens such as `[Muziek]`.
3. Add a small phrase-quality score that separates timing quality from transcript text quality.
4. Re-run the safe cached fixture shootout.
5. If `xymyDvCgWDA` and `KrdVIUmBoE4` remain phrase-sized and duplicate artifacts are explainable, stop and productize Stage 1.
6. If display-text quality is still not good enough on manual+ASR videos, prototype Stage 2 on `RJrjzCuCHpo`.
