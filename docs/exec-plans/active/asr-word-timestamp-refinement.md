# ASR Word Timestamp Refinement

Status: active improvement note, June 25, 2026.

## Goal

Improve phrase start/stop quality for the `ASR transcript` source without adding
more learner-facing buttons or making ASR run more than once per timing job.

This is a follow-up to:

- `docs/exec-plans/active/subtitle-source-quality-shootout.md`
- `docs/exec-plans/active/rolling-caption-alignment-quality.md`
- `docs/runbooks/youtube-shadowing-playback-regression-log.md`

## Current Trigger Case

Fixture:

```text
SJvlUB4F-G0
```

Observed with the public Dell backend and the YouTube extension on June 25,
2026:

- one `Improve Timing` job can produce both:
  - auto-caption text aligned to ASR timing;
  - a `pure-asr` alternative source;
- the `pure-asr` alternative has much cleaner learner text than YouTube rolling
  auto captions on this fixture;
- phrase 8 in the UI (`index=7`) starts too early for shadowing. This case and
  later playback-stop edge cases are preserved as repeatable regression checks
  in `docs/runbooks/youtube-shadowing-playback-regression-log.md`:

```text
36.91 - 43.03  Het is al een paar dagen heel warm.
```

The ASR word artifact explains the bad feel:

```text
previous phrase:
  gezondheid. 36.35 - 36.91

phrase 8:
  Het 36.91 - 37.99
  is 40.81 - 40.97
  al 40.97 - 41.19
  een 41.19 - 41.37
  paar 41.37 - 41.59
  dagen 41.59 - 42.09
  heel 42.09 - 42.57
  warm. 42.57 - 43.03
```

The problem is not the extension's normal `150ms` pre-roll. Whisper assigned the
first word of the next phrase directly at the previous phrase boundary, then
left a multi-second gap before the rest of the words.

## Prior Evidence To Preserve

Earlier local ASR work already compared `faster-whisper` and `stable-ts` on
`RJrjzCuCHpo`:

| Fixture | Window | Engine | Model | Result |
| --- | ---: | --- | --- | --- |
| `RJrjzCuCHpo` | `90s` | `faster-whisper` | `mobiuslabsgmbh/faster-whisper-large-v3-turbo` | Best initial baseline; 16/17 projected cues ASR-aligned. |
| `RJrjzCuCHpo` | `90s` | `stable-ts` | `base` | Too weak for the Dutch sample; transcription errors dominated. |
| `RJrjzCuCHpo` | `90s` | `stable-ts` | `small` | Better than base, still below faster-whisper large-v3-turbo. |
| `RJrjzCuCHpo` | `300s` | `faster-whisper` | `mobiuslabsgmbh/faster-whisper-large-v3-turbo` | Best current five-minute result. |
| `RJrjzCuCHpo` | `300s` | `stable-ts` | `large-v3-turbo` | Very close, but not a clear replacement. |

Do not restart this comparison from scratch. Reuse these artifacts as the
baseline and add new experiments only where they answer a new question.

Known prior gap:

- `stable-ts` was tested as an ASR/alignment comparison path;
- `WhisperX` has not yet been tested in this project;
- `CrisperWhisper` has not yet been tested in this project;
- the new issue is specifically about suspicious pure-ASR word/phrase boundary
  starts, not only manual-caption projection.

## Current Research Addendum

Sources checked on June 25, 2026:

- WhisperX paper: https://arxiv.org/html/2303.00747v2
- WhisperX repository: https://github.com/m-bain/whisperX
- stable-ts repository: https://github.com/jianfch/stable-ts
- whisper-timestamped repository:
  https://github.com/linto-ai/whisper-timestamped
- CrisperWhisper paper: https://arxiv.org/html/2408.16589v1
- Montreal Forced Aligner docs:
  https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/index.html
- forced-alignment comparison paper:
  https://arxiv.org/html/2406.19363v1
- PyTorch multilingual forced alignment tutorial:
  https://docs.pytorch.org/audio/2.8/tutorials/forced_alignment_for_multilingual_data_tutorial.html

Relevant takeaways:

- WhisperX treats Whisper timestamps as unreliable enough to add VAD
  pre-segmentation and forced phoneme alignment.
- VAD is useful before ASR/alignment because it constrains work to speech
  regions and avoids relying on long inactive regions.
- stable-ts is directly relevant to this problem because it includes timestamp
  stabilization, silence suppression, and gap adjustment around Whisper-style
  timestamps. Development is paused, so treat it as a comparison/reference path,
  not an obvious long-term dependency.
- whisper-timestamped uses DTW over Whisper cross-attention and provides word
  confidence/VAD options; it is a possible lightweight comparison path.
- CrisperWhisper is interesting because it targets more accurate word-level
  timestamps with a Whisper-family model, but it is a larger model/pipeline
  choice rather than a small post-processing patch.
- MFA remains a high-quality forced-alignment candidate, but it adds
  pronunciation dictionaries/acoustic-model setup and is operationally heavier.
  The 2024 comparison paper found MFA outperforming WhisperX and MMS on
  word-level forced alignment in their evaluated English corpora.

## Candidate Fixes

### Track A: Conservative Playback-Only Boundary Cleanup

Use the existing ASR word timings and add a non-destructive playback start
adjustment. Do not mutate the transcript artifact yet.

Suspicious early-start pattern:

1. previous phrase ends close to this phrase start, for example `<= 300ms`;
2. the gap after the first word is large, for example `>= 900ms`;
3. that first-word gap is an outlier relative to local word gaps, for example
   `>= 3x` the median internal word gap;
4. if VAD/silence data is available, the region before the dense word cluster is
   not active speech.

If all gates pass, start playback at the first dense word cluster rather than at
the segment start. Keep transcript text unchanged and expose a diagnostic flag
such as `asr-suspicious-leading-word-gap`.

Why this is safe:

- it affects only learner playback timing;
- it does not discard text;
- it can be disabled or compared per phrase;
- it avoids treating every pause after a short word as a bug.

Risk:

- without VAD confirmation, a real utterance like `Het... is al...` could be
  shortened incorrectly. The first implementation should therefore report rather
  than silently rewrite whenever confidence is low.

### Track B: Add VAD/Silence Mask To The Existing Worker

Generate a speech-activity mask from `audio.wav` during the ASR job and use it
to validate phrase starts and long internal word gaps.

Possible implementation routes:

- lightweight RMS/energy baseline;
- Silero VAD if dependency footprint is acceptable;
- WebRTC VAD if quality is sufficient for Dutch news audio.

This should still preserve the one-button product model. VAD runs inside the
same backend job after audio download.

### Track C: Compare Mature Alignment Pipelines On Fixtures

Run a small lab comparison against existing artifacts:

Fixtures:

- `SJvlUB4F-G0`: pure ASR is textually good, but phrase 8 starts too early.
- `RJrjzCuCHpo`: existing stable-ts/faster-whisper comparison baseline.
- `4EE7m94mJpk`: normal manual Dutch fixture.
- `xymyDvCgWDA`: auto-only fixture.

Candidates:

- current `faster-whisper-large-v3-turbo` worker output;
- current output plus Track A cleanup;
- stable-ts `large-v3-turbo`;
- WhisperX forced alignment;
- whisper-timestamped;
- CrisperWhisper if setup cost is acceptable.

Metrics:

- phrase count and max phrase duration;
- suspicious leading-word-gap count;
- long internal word-gap count;
- overlap/zero-gap phrase boundaries;
- token coverage for manual-text projection;
- manual listening notes for a short fixed window.

Do not promote a new model only because it improves one phrase. It must beat the
current pipeline on at least the trigger case and not regress existing fixtures.

## Proposed Next Step

Implement Track A first as an instrumented experiment:

1. detect suspicious leading-word gaps in ASR phrase artifacts;
2. add diagnostics to the ASR preview/report;
3. optionally use the adjusted start only in playback, guarded by a feature flag;
4. run it on `SJvlUB4F-G0` and the existing `RJrjzCuCHpo` artifacts;
5. if it helps, add VAD confirmation before making it default.

Then run Track C for WhisperX and possibly whisper-timestamped/CrisperWhisper as
a comparison, not as an immediate architecture switch.
