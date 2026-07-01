# YouTube Shadowing Playback Regression Log

Status: active fixture log, June 25, 2026.

Use this file when changing ASR timing, phrase building, replay, Next/Previous,
auto-pause, or extension source loading. It records concrete videos and phrase
edge cases that already regressed once, so future changes can be checked against
the same evidence.

## Playback Model

The extension does not play a phrase directly from `phrase.startMs` to
`phrase.endMs`.

Current playback path:

1. `loadPracticeSource` turns backend phrases into extension phrases.
2. `playPhrase` seeks to `phrasePlaybackStartMs(phrase) - PRE_ROLL_MS`.
3. `playbackEndMsForPhrase` decides where guided playback should pause.
4. `enforcePhraseEnd` pauses active replay when the YouTube video reaches that
   stop time.
5. `syncPassivePlayback` applies the same stop rule during passive guided
   playback when auto-pause is enabled.

Current constants in `extensions/youtube-shadowing/src/content.js`:

| Constant | Value | Purpose |
| --- | ---: | --- |
| `PRE_ROLL_MS` | `150` | Start slightly before the phrase or adjusted playback start. |
| `POST_ROLL_MS` | `500` | Let short phrase endings breathe when there is room. |
| `MIN_AUDIBLE_END_TAIL_MS` | `300` | Keep a short audible tail after phrase end even at tight boundaries. |
| `CONTIGUOUS_BOUNDARY_GUARD_MS` | `120` | Avoid leaking into the next phrase when the next phrase begins inside the post-roll window. |

Important policy:

- `playbackStartSec` is playback-only. It does not rewrite transcript text or
  phrase `startSec`.
- The boundary guard may remove part of post-roll, but it must preserve an
  audible tail after `phrase.endMs`.
- ASR word-level timings are treated as stronger evidence than YouTube rolling
  auto-caption phrase boundaries, but playback still has to handle exact
  zero-gap boundaries.

## Fixture: NOS Makkelijke Taal, June 25, 2026

Video:

```text
https://www.youtube.com/watch?v=SJvlUB4F-G0
```

Backend cache probe:

```bash
curl -sS 'https://audiofilms-api.dilum.io/api/practice/timing-jobs' \
  -H 'content-type: application/json' \
  --data '{"videoId":"SJvlUB4F-G0","lang":"nl","sourceKind":"auto","textSource":"auto","fullAudio":true,"reuseOnly":true}'
```

Expected cached operation shape observed on June 25, 2026:

| Field | Expected |
| --- | --- |
| `state` | `succeeded` |
| main source | auto captions aligned to ASR timing |
| `alternatives[0].id` | `pure-asr` |
| ASR phrase count | `150` |
| main auto-aligned phrase count | `488` |

The main auto-aligned set is intentionally noisy on this video because YouTube
auto captions are rolling and overlap heavily. The ASR alternative is the
learner-quality source for the checks below.

## Edge Case 1: Suspicious Leading Word Gap

Source: `ASR transcript`.

UI phrase:

```text
8 / 150
```

Internal phrase:

```text
id: 7
text: Het is al een paar dagen heel warm.
startSec: 36.91
endSec: 43.03
playbackStartSec: 40.81
timingFlags: ["asr-suspicious-leading-word-gap"]
```

Word evidence:

| Word | Start | End |
| --- | ---: | ---: |
| `Het` | `36.91` | `37.99` |
| `is` | `40.81` | `40.97` |
| `al` | `40.97` | `41.19` |
| `een` | `41.19` | `41.37` |
| `paar` | `41.37` | `41.59` |
| `dagen` | `41.59` | `42.09` |
| `heel` | `42.09` | `42.57` |
| `warm.` | `42.57` | `43.03` |

Failure symptom:

- replay starts at the end of the previous phrase;
- the learner hears a long instrumental/silence gap before the actual phrase;
- the visible text starts with `Het is al...`, but the useful spoken cluster
  starts at `is`.

Guard:

- backend detects `asr-suspicious-leading-word-gap`;
- backend adds `playbackStartSec` using the second word start;
- extension maps it to `playbackStartMs`;
- `playPhrase` seeks to `playbackStartMs - PRE_ROLL_MS`, not the raw
  `startMs - PRE_ROLL_MS`.

Regression check:

- selecting phrase 8 should seek near `40.66s`, not `36.76s`;
- the transcript text should still show the full phrase;
- the timing flag should remain visible in debug diagnostics or backend JSON.

## Edge Case 2: Exact Zero-Gap Boundary Must Not Cut The Current Phrase

Source: `ASR transcript`.

UI phrase:

```text
14 / 150
```

Internal phrase:

```text
id: 13
text: Maar morgen is het code rood in een groot deel van Nederland.
startSec: 64.03
endSec: 67.59
```

Neighbor:

```text
next id: 14
next text: Dat betekent dat iedereen last kan krijgen van de hitte.
next startSec: 67.59
```

Word evidence:

| Word | Start | End |
| --- | ---: | ---: |
| `Maar` | `64.03` | `64.53` |
| `morgen` | `64.53` | `65.01` |
| `is` | `65.01` | `65.39` |
| `het` | `65.39` | `65.55` |
| `code` | `65.55` | `65.83` |
| `rood` | `65.83` | `66.19` |
| `in` | `66.19` | `66.33` |
| `een` | `66.33` | `66.47` |
| `groot` | `66.47` | `66.79` |
| `deel` | `66.79` | `67.07` |
| `van` | `67.07` | `67.23` |
| `Nederland.` | `67.23` | `67.59` |

Failure symptom:

- replay stops before the phrase finishes;
- the end of `Nederland.` is clipped.

Root cause that regressed:

```text
old stop = next.startSec - CONTIGUOUS_BOUNDARY_GUARD_MS
old stop = 67.59 - 0.12 = 67.47
phrase end = 67.59
```

Guard:

- when the next phrase begins inside the post-roll window, clamp the guarded
  stop to at least `phrase.endMs + MIN_AUDIBLE_END_TAIL_MS`;
- the guard can remove part of the `500ms` post-roll, but cannot cut the current
  phrase or its audible tail.

Regression check:

- selecting phrase 14 should pause around `67.89s`;
- it may not leak meaningfully into phrase 15;
- it must not pause at `67.47s`.

## Edge Case 3: Normal Gap Should Keep Post-Roll

Source: `ASR transcript`.

UI phrase:

```text
16 / 150
```

Internal phrase:

```text
id: 15
text: Dat is zo in deze provincies.
startSec: 71.77
endSec: 73.59
next startSec: 75.61
```

Expected playback:

```text
stop = 73.59 + POST_ROLL_MS = 74.09
```

Regression check:

- selecting phrase 16 should not stop early;
- the pause should happen around `74.09s`;
- this case should not be affected by the exact-boundary guard.

## Manual Regression Procedure

After backend deploy or unpacked extension reload:

Automated focused smoke:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-asr-edge
```

If the current Chrome profile does not expose the cached `ASR transcript`
source for `SJvlUB4F-G0`, the focused smoke reports the fixture as quarantined
and skips timing assertions. Treat that as "cache fixture unavailable", not as
proof that ASR replay timing is green.

Manual fallback:

1. Open `https://www.youtube.com/watch?v=SJvlUB4F-G0`.
2. Reload the unpacked extension and reload the YouTube tab.
3. Open AudioFilms and select `ASR transcript`.
4. Confirm the source appears from cache without pressing `Improve Timing` again
   when a completed timing job already exists.
5. Jump to phrase 8 and replay. It should start near the spoken cluster, not at
   the previous phrase boundary.
6. Jump to phrase 14 and replay. It should finish `Nederland.` without clipping.
7. Jump to phrase 16 and replay. It should keep the normal short post-roll.
8. Use the debug panel or diagnostics dataset to inspect `seekToSec`,
   `phraseStartSec`, `playbackStartSec`, and `expectedPauseAtSec` when a result
   feels wrong.

Useful diagnostics from the YouTube page console:

```js
JSON.parse(document.documentElement.dataset.afShadowingDiagnosticsState || "{}")
```

## Compact Backend Inspection Script

Use this to print the ASR phrase timing around the known fixture cases:

```bash
curl -sS 'https://audiofilms-api.dilum.io/api/practice/timing-jobs' \
  -H 'content-type: application/json' \
  --data '{"videoId":"SJvlUB4F-G0","lang":"nl","sourceKind":"auto","textSource":"auto","fullAudio":true,"reuseOnly":true}' \
| node -e '
let s = "";
process.stdin.on("data", d => s += d);
process.stdin.on("end", () => {
  const j = JSON.parse(s);
  const phrases = j.result?.alternatives?.[0]?.snapshot?.phraseSet?.phrases || [];
  for (const oneBased of [8, 14, 16]) {
    const index = oneBased - 1;
    const phrase = phrases[index];
    const previous = phrases[index - 1];
    const next = phrases[index + 1];
    console.log(JSON.stringify({
      oneBased,
      id: phrase?.id,
      text: phrase?.text,
      startSec: phrase?.startSec,
      endSec: phrase?.endSec,
      playbackStartSec: phrase?.playbackStartSec,
      flags: phrase?.timingFlags || [],
      previousEndSec: previous?.endSec,
      nextStartSec: next?.startSec,
      firstWord: phrase?.wordTimings?.[0],
      lastWord: phrase?.wordTimings?.[phrase.wordTimings.length - 1],
    }, null, 2));
  }
});
'
```

## When Adding A New Edge Case

Append a new section with:

- video URL and video id;
- selected source name;
- UI phrase number and internal phrase id;
- exact text;
- previous/current/next start and end times;
- word timings for the first and last words, plus any suspicious internal gap;
- observed failure symptom;
- guard or code path responsible;
- expected replay seek and pause times;
- whether the check should become manual-only or automated.

Do not overwrite old cases after fixing them. Keep the old failure mode and the
new expected behavior so regressions remain understandable.
