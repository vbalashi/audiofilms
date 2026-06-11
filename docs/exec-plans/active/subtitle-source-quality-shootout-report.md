# Subtitle Source Quality Shootout Report

Generated: 2026-06-11T11:49:24.826Z

Supadata/API calls included: no

## Recommended Source By Fixture

| Fixture | Recommendation | Confidence | Why |
| --- | --- | --- | --- |
| manual-asr-divergence (RJrjzCuCHpo) | yt-dlp-auto | medium | Manual captions exist, but automatic captions currently provide better phrase timing after rolling-caption normalization. |
| normal-manual (4EE7m94mJpk) | yt-dlp-manual | high | Manual captions are available and already phrase-sized enough for shadowing. |
| auto-only (xymyDvCgWDA) | yt-dlp-auto | high | No manual captions are available, and automatic captions normalize into usable phrase-sized cues. |
| no-captions (EColTNIbOko) | none | high | No usable caption source was found. The UI should show the no-captions state and avoid paid retries during normal playback. |
| provider-fallback-stress (KrdVIUmBoE4) | yt-dlp-manual | high | Manual captions are available and already phrase-sized enough for shadowing. |
| multilingual-manual (aircAruvnKk) | yt-dlp-manual | high | Manual captions are available and already phrase-sized enough for shadowing. |

## Clean Text + ASR Timing Feasibility

| Fixture | Status | Confidence | Manual coverage | ASR coverage | Why |
| --- | --- | --- | ---: | ---: | --- |
| manual-asr-divergence (RJrjzCuCHpo) | candidate | high | 0.779 | 0.86 | Manual and ASR text are close enough for a lightweight token-alignment experiment. |
| normal-manual (4EE7m94mJpk) | candidate | medium | 0.713 | 0.925 | Manual and ASR text partially match; alignment may work only after better normalization and local-window matching. |
| auto-only (xymyDvCgWDA) | not-applicable | none |  |  | Clean-text/ASR-timing alignment needs both manual and automatic captions. |
| no-captions (EColTNIbOko) | not-applicable | none |  |  | Clean-text/ASR-timing alignment needs both manual and automatic captions. |
| provider-fallback-stress (KrdVIUmBoE4) | candidate | high | 0.808 | 0.786 | Manual and ASR text are close enough for a lightweight token-alignment experiment. |
| multilingual-manual (aircAruvnKk) | candidate | high | 0.877 | 0.987 | Manual and ASR text are close enough for a lightweight token-alignment experiment. |

## Raw Measurements

| Fixture | Source | Status | Provider | Track | Raw | Normalized | Timing | Text | Dups | Non-speech | Flags | Max cue | Longest cue | Sample |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- | --- |
| manual-asr-divergence (RJrjzCuCHpo) | yt-dlp-manual | ok | yt-dlp | nl | 138 | 138 | 0 | 98 | 1 | 0 | long-cues, duplicate-text | 22.28 | En we laten zien dat de politie ouders oproept... | Goedemiddag. |
| manual-asr-divergence (RJrjzCuCHpo) | yt-dlp-auto | ok | yt-dlp | nl-orig | 384 | 187 | 100 | 100 | 0 | 0 | phrase-sized | 4.95 | Meer eh schoenen, sjaals, petten, tassen, van alles. | Goedemiddag. |
| normal-manual (4EE7m94mJpk) | yt-dlp-manual | ok | yt-dlp | nl | 185 | 185 | 88 | 58 | 1 | 0 | duplicate-text | 7.48 | Ons sterrenstelsel, de Melkweg is een enorme wervelende oase van honderden miljarden sterren. | Kijk goed. |
| normal-manual (4EE7m94mJpk) | yt-dlp-auto | ok | yt-dlp | nl-orig | 446 | 232 | 100 | 96 | 2 | 0 | duplicate-text, phrase-sized | 4.6 | ster met ronddraaiende planeten heet een planetenstelsel en de onze heet het | Kijk goed, maar echt goed. |
| auto-only (xymyDvCgWDA) | yt-dlp-manual | not-found | yt-dlp |  | 0 | 0 | 0 | 0 | 0 | 0 | empty | 0 |  | No matching track key |
| auto-only (xymyDvCgWDA) | yt-dlp-auto | ok | yt-dlp | nl-orig | 144 | 67 | 100 | 98 | 1 | 0 | duplicate-text, phrase-sized | 2.719 | bekwaamheid te behouden Kortom bekwaam blijf je door te | als ambulancezorg professional ben je |
| no-captions (EColTNIbOko) | yt-dlp-manual | not-found | yt-dlp |  | 0 | 0 | 0 | 0 | 0 | 0 | empty | 0 |  | No matching track key |
| no-captions (EColTNIbOko) | yt-dlp-auto | not-found | yt-dlp |  | 0 | 0 | 0 | 0 | 0 | 0 | empty | 0 |  | No matching track key |
| provider-fallback-stress (KrdVIUmBoE4) | yt-dlp-manual | ok | yt-dlp | nl | 162 | 162 | 85 | 56 | 2 | 0 | duplicate-text | 7.846 | Het is met bloed gebouwd. We dansen straks op graven van 6500 mensen. | Hey, kijk mee. |
| provider-fallback-stress (KrdVIUmBoE4) | yt-dlp-auto | ok | yt-dlp | nl-orig | 572 | 291 | 100 | 94 | 3 | 0 | duplicate-text, phrase-sized | 4.639 | "FIFA sta op." There are real risks for them, including they may | Hey, kijk mee. |
| multilingual-manual (aircAruvnKk) | yt-dlp-manual | ok | yt-dlp | en | 286 | 286 | 84 | 60 | 0 | 0 |  | 7.962 | to the connections between one layer and a particular neuron in the next layer. | This is a 3. |
| multilingual-manual (aircAruvnKk) | yt-dlp-auto | ok | yt-dlp | en-orig | 984 | 487 | 100 | 94 | 3 | 0 | duplicate-text, phrase-sized | 3.35 | Remember how earlier I said these neurons are | This is a three. |

## Fixture Details

### manual-asr-divergence (RJrjzCuCHpo)

Manual Dutch has a long cue; ASR Dutch exposes rolling VTT.

Title: Fans naar WK maar ook mensen geweigerd, pepperspray misschien legaal en oproep om fatbike te checken

Available nl tracks: manual=nl; auto=nl, nl-orig

- yt-dlp-manual: ok; raw 138, normalized 138; timing 0, text 98; flags long-cues, duplicate-text; max 22.28s.
- yt-dlp-auto: ok; raw 384, normalized 187; timing 100, text 100; flags phrase-sized; max 4.95s.

### normal-manual (4EE7m94mJpk)

Normal manual Dutch extension fixture.

Title: Is dit de ruimte-ontdekking van de eeuw?

Available nl tracks: manual=nl; auto=nl, nl-orig

- yt-dlp-manual: ok; raw 185, normalized 185; timing 88, text 58; flags duplicate-text; max 7.48s.
- yt-dlp-auto: ok; raw 446, normalized 232; timing 100, text 96; flags duplicate-text, phrase-sized; max 4.6s.

### auto-only (xymyDvCgWDA)

Dutch auto-caption-only fixture.

Title: Bekwaam blijf je door te doen! (zonder ondertiteling)

Available nl tracks: manual=-; auto=nl-orig, nl

- yt-dlp-manual: not-found; raw 0, normalized 0; timing 0, text 0; flags empty; max 0s.
- yt-dlp-auto: ok; raw 144, normalized 67; timing 100, text 98; flags duplicate-text, phrase-sized; max 2.719s.

### no-captions (EColTNIbOko)

No-caption empty-state fixture.

Title: Forests from Above (No Sound) — 10 Hours Screensaver of 4K UHD Drone Aerials

Available nl tracks: manual=-; auto=-

- yt-dlp-manual: not-found; raw 0, normalized 0; timing 0, text 0; flags empty; max 0s.
- yt-dlp-auto: not-found; raw 0, normalized 0; timing 0, text 0; flags empty; max 0s.

### provider-fallback-stress (KrdVIUmBoE4)

Provider/geography fallback stress fixture.

Title: Is dit het meest politieke WK ooit?

Available nl tracks: manual=nl; auto=nl, nl-orig

- yt-dlp-manual: ok; raw 162, normalized 162; timing 85, text 56; flags duplicate-text; max 7.846s.
- yt-dlp-auto: ok; raw 572, normalized 291; timing 100, text 94; flags duplicate-text, phrase-sized; max 4.639s.

### multilingual-manual (aircAruvnKk)

Many manual languages; English should be selectable.

Title: But what is a neural network? | Deep learning chapter 1

Available en tracks: manual=en; auto=en, en-orig

- yt-dlp-manual: ok; raw 286, normalized 286; timing 84, text 60; flags -; max 7.962s.
- yt-dlp-auto: ok; raw 984, normalized 487; timing 100, text 94; flags duplicate-text, phrase-sized; max 3.35s.

