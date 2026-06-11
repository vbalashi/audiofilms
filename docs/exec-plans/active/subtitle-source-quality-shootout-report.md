# Subtitle Source Quality Shootout Report

Generated: 2026-06-11T11:19:00.610Z

Supadata/API calls included: no

| Fixture | Source | Status | Provider | Track | Raw | Normalized | Flags | Max cue | Sample |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
| manual-asr-divergence (RJrjzCuCHpo) | yt-dlp-manual | ok | yt-dlp | nl | 138 | 138 | long-cues, duplicate-text | 22.28 | Goedemiddag. |
| manual-asr-divergence (RJrjzCuCHpo) | yt-dlp-auto | ok | yt-dlp | nl-orig | 384 | 250 | overlap-cues | 4.95 | Goedemiddag. |
| normal-manual (4EE7m94mJpk) | yt-dlp-manual | ok | yt-dlp | nl | 185 | 185 | duplicate-text | 7.48 | Kijk goed. |
| normal-manual (4EE7m94mJpk) | yt-dlp-auto | ok | yt-dlp | nl-orig | 446 | 305 | overlap-cues, duplicate-text | 7.35 | Kijk goed, maar echt goed. |
| auto-only (xymyDvCgWDA) | yt-dlp-manual | not-found | yt |  | 0 | 0 | empty | 0 | No matching track key |
| auto-only (xymyDvCgWDA) | yt-dlp-auto | ok | yt-dlp | nl-orig | 144 | 68 | duplicate-text | 10.76 | [Muziek] als ambulancezorg professional ben je |
| no-captions (EColTNIbOko) | yt-dlp-manual | not-found | yt |  | 0 | 0 | empty | 0 | No matching track key |
| no-captions (EColTNIbOko) | yt-dlp-auto | not-found | yt |  | 0 | 0 | empty | 0 | No matching track key |
| provider-fallback-stress (KrdVIUmBoE4) | yt-dlp-manual | ok | yt-dlp | nl | 162 | 162 |  | 7.846 | Hey, kijk mee. |
| provider-fallback-stress (KrdVIUmBoE4) | yt-dlp-auto | ok | yt-dlp | nl-orig | 572 | 386 | long-cues, overlap-cues, duplicate-text | 14.71 | Hey, kijk mee. |
| multilingual-manual (aircAruvnKk) | yt-dlp-manual | ok | yt-dlp | en | 286 | 286 |  | 7.962 | This is a 3. |
| multilingual-manual (aircAruvnKk) | yt-dlp-auto | ok | yt-dlp | en-orig | 984 | 600 | overlap-cues, duplicate-text | 4.949 | This is a three. |

## Fixture Details

### manual-asr-divergence (RJrjzCuCHpo)

Manual Dutch has a long cue; ASR Dutch exposes rolling VTT.

Title: Fans naar WK maar ook mensen geweigerd, pepperspray misschien legaal en oproep om fatbike te checken

Available nl tracks: manual=nl; auto=nl, nl-orig

- yt-dlp-manual: ok; raw 138, normalized 138; flags long-cues, duplicate-text; max 22.28s.
- yt-dlp-auto: ok; raw 384, normalized 250; flags overlap-cues; max 4.95s.

### normal-manual (4EE7m94mJpk)

Normal manual Dutch extension fixture.

Title: Is dit de ruimte-ontdekking van de eeuw?

Available nl tracks: manual=nl; auto=nl, nl-orig

- yt-dlp-manual: ok; raw 185, normalized 185; flags duplicate-text; max 7.48s.
- yt-dlp-auto: ok; raw 446, normalized 305; flags overlap-cues, duplicate-text; max 7.35s.

### auto-only (xymyDvCgWDA)

Dutch auto-caption-only fixture.

Title: Bekwaam blijf je door te doen! (zonder ondertiteling)

Available nl tracks: manual=-; auto=nl-orig, nl

- yt-dlp-manual: not-found; raw 0, normalized 0; flags empty; max 0s.
- yt-dlp-auto: ok; raw 144, normalized 68; flags duplicate-text; max 10.76s.

### no-captions (EColTNIbOko)

No-caption empty-state fixture.

Title: Forests from Above (No Sound) — 10 Hours Screensaver of 4K UHD Drone Aerials

Available nl tracks: manual=-; auto=-

- yt-dlp-manual: not-found; raw 0, normalized 0; flags empty; max 0s.
- yt-dlp-auto: not-found; raw 0, normalized 0; flags empty; max 0s.

### provider-fallback-stress (KrdVIUmBoE4)

Provider/geography fallback stress fixture.

Title: Is dit het meest politieke WK ooit?

Available nl tracks: manual=nl; auto=nl, nl-orig

- yt-dlp-manual: ok; raw 162, normalized 162; flags -; max 7.846s.
- yt-dlp-auto: ok; raw 572, normalized 386; flags long-cues, overlap-cues, duplicate-text; max 14.71s.

### multilingual-manual (aircAruvnKk)

Many manual languages; English should be selectable.

Title: But what is a neural network? | Deep learning chapter 1

Available en tracks: manual=en; auto=en, en-orig

- yt-dlp-manual: ok; raw 286, normalized 286; flags -; max 7.962s.
- yt-dlp-auto: ok; raw 984, normalized 600; flags overlap-cues, duplicate-text; max 4.949s.

