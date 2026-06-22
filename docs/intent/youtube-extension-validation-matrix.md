# YouTube Extension Validation Matrix

Status: active validation note, June 11, 2026.

Note: this file records observed behavior from the current extension and older
smoke runs. Labels such as `Dutch · Manual · exact`, `via yt-dlp`,
`backend-provider`, and `timedtext` are historical/debug evidence. They are not
the redesign target. Current product language for new UI work is in
`docs/intent/youtube-extension-designer-brief.md` and
`docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`.

Do not copy the visible badge wording from historical expected-results cells
into new UI work. Treat those strings as validation evidence for the current
spike only.

This matrix keeps AudioFilms YouTube extension testing broader than one happy-path video. It covers the extension plus the local app API because the extension now uses `/api/get-subs` as its provider fallback.

## Failure Categories

- `boot`: content script did not load, boot badge missing, or extension reload/profile state is wrong.
- `youtube-adapter`: video id, player response, caption tracks, or visible video selection failed.
- `retrieval`: timedtext/backend/transcript ladder failed or returned misleading source metadata.
- `phrase-building`: cues loaded but phrase units are empty, too long, duplicated, or poorly segmented.
- `player-control`: replay/next/previous/auto-pause/key handling behaves incorrectly.
- `ui`: overlay blocks YouTube, text overlaps, source state is unclear, or AudioFilms Off does not restore the page.

## Required Checks

For extension smoke checks:

- boot indicator appears;
- video id detected;
- visible video selected;
- caption tracks detected;
- selected source shown;
- retrieval path shown in debug;
- phrase list non-empty when captions are expected;
- replay stops near phrase end;
- Previous/Next advance from the visible selected phrase, not from the YouTube playhead;
- Space toggles continuous YouTube play/pause and exits guided phrase playback;
- ArrowDown replays the current visible phrase;
- Mark Issue copies a navigation incident report after a manual miss;
- source mismatch or unknown source warning appears only when metadata is actually uncertain;
- AudioFilms Off removes the learning layer and leaves YouTube visually normal.
- Primary learner-facing UI does not show technical source terms such as
  `manual`, `exact`, `timedtext`, `yt-dlp`, or `provider`.
- Primary phrase navigation uses compact icon controls with accessible labels,
  not large text-only tool buttons.
- Shadow/Recall switching keeps the phrase panel width and height stable.
- `Show Translation` and Recall prompt render an actionable state for the
  current phrase: translated text, loading, connect-required, or failure; never
  raw `unavailable` copy.
- The debug tools trigger is a compact labelled icon button, opens the utility
  menu, and closes with Escape.
- The readiness chip includes a visual status dot and uses learner-facing
  labels such as `Ready`, `Rough`, `Precise`, `Improving...`, or `No captions`.
- `Improve Timing` is an enabled readiness action for a loaded caption source;
  clicking it must show operation feedback or an actionable backend error, not a
  disabled implementation placeholder.
- The dictionary panel keeps clicked-word context visible and never exposes raw
  HTML returned by an API failure.
- The main phrase ribbon header carries account placement; the dictionary header
  stays lookup-focused. The account icon opens a popover with a
  connect/reconnect/disconnect action.
- Dictionary V2 card UI is covered with a controlled smoke fixture: card title,
  chips, sections, phase-dependent progress actions, card translation ready
  state, card translation error state, and hidden/frozen cards with no progress
  row.

For local app API checks:

- `/api/get-subs` returns `phrases[]`;
- response includes actual `language`;
- `meta.provider`, `meta.sourceKind`, `meta.retrievalPath`, `meta.timingExactness`, `meta.qualityFlags`, and `meta.warnings` are present or intentionally absent for old cached data;
- failure responses are categorized and user-actionable.

## Fixtures

| Fixture | Video ID | Purpose | Expected Result | Current Status |
| --- | --- | --- | --- | --- |
| NOS TRAPPIST-1 manual Dutch | `4EE7m94mJpk` | Current extension happy path; manual Dutch captions; direct timedtext returns empty in Chrome; completed ASR timing exists in backend cache | Extension first reuses cached ASR timing, shows `ASR transcript · Precise`, `143` practice phrases, and keeps `Improve Timing` disabled because timing is already best available | Passing in latest Chrome smoke |
| App sample video | `iDi5MhglYks` | Main app sample and provider quality comparison video; browser-visible YouTube track differs from provider result | API returns Dutch manual phrases; extension follows browser-visible auto-generated source and labels it as auto | API passing: 213 manual phrases; extension smoke passing with 106 auto-visible phrases |
| Provider fallback stress video | `KrdVIUmBoE4` | Browser-visible manual captions where the primary provider can be unavailable and fallback provider must carry the load | Extension shows manual exact phrases plus a source warning instead of stale phrases or a hard failure | API passing via `yt-dlp` fallback: 162 phrases; extension smoke passing |
| Multilingual English manual video | `aircAruvnKk` | Many manual caption languages are available; first YouTube manual track is not the preferred language | Extension should choose preferred English manual captions instead of arbitrary first manual track | API passing: 286 English phrases; extension smoke passing with 271 phrase units |
| Multilingual Arabic source switch and lookup | `aircAruvnKk` English -> Arabic | Non-Latin/RTL manual captions should remain selectable, renderable, and word-clickable from the source menu | Arabic manual source loads, source badge updates, row contains Arabic text, word click opens dictionary context, no visible error | API passing: 217 Arabic phrases; extension smoke passing with 213 phrase units |
| Legacy extension NOS fixture | `ZNQWWW-vvfM` | Earlier extension target with manual Dutch and auto/original Dutch tracks | Extension should prefer first non-ASR Dutch track and show source metadata | API passing: 149 phrases; extension SPA smoke passing |
| Dutch auto-caption-only video | `xymyDvCgWDA` | Ensure auto captions are selected and labeled as degraded only if quality flags say so | Shows `Auto · exact` or degraded flags when appropriate | API and extension smoke passing with `overlap-cues` warning |
| Manual/ASR divergence video | `RJrjzCuCHpo` | YouTube exposes manual Dutch plus auto Dutch; manual has a 22s long cue, ASR has rolling captions/word timing, and backend provider can return the same 138-cue transcript for both | Treat manual as degraded via `long-cues`; do not assume backend `sourceKind=auto` proves that the actual YouTube ASR track was loaded unless provider/origin and cue shape confirm it | Diagnostic case, not in full smoke yet |
| No captions video | `EColTNIbOko` | Empty-state behavior | Clear no-subtitles error, no fake transcript fallback, compact empty UI without playback controls | API and extension smoke passing |
| Backend failed degraded state | `4EE7m94mJpk` with unavailable backend URL | Caption tracks exist, YouTube timedtext is empty, and backend provider cannot be reached | Clear provider-failed error, `0 / 0`, hidden playback controls, no stale phrases | Passing in normal Chrome smoke |
| Failed source switch | `4EE7m94mJpk` manual -> auto with unavailable backend URL | A working source is already loaded, but the newly selected source fails | Keep previous source, count, and phrase visible; record error on failed source option | Passing in normal Chrome smoke |
| SPA navigation | `4EE7m94mJpk` -> `ZNQWWW-vvfM` -> `4EE7m94mJpk` | YouTube watch-page navigation reset | Video id, tracks, phrases, and selected source reset | Passing in normal Chrome smoke |
| Logged-out clean Chrome profile | Temporary Chrome for Testing profile | Boot reproducibility without existing profile state | Boot marker and toggle appear after extension load and tab reload | Passing in CDP smoke |
| Viewport variants | `4EE7m94mJpk` | Compact UI responsiveness | No overlap at narrow/wide widths; YouTube recommendations not replaced | Passing DOM-geometry smoke; screenshots captured |

## Latest Run

### 2026-06-19: Final UI Slice Smoke, Normal Chrome

Fixture: `4EE7m94mJpk`, focused geometry/UI smoke.

Result:

- unpacked extension `hhdkchoccmikoefhenobdjipgdppdpoc` was reloaded;
- `Shadow` -> `Recall` -> `Shadow` kept the ribbon stable at `236 x 760`;
- Recall prompt and `Show Translation` showed the actionable logged-out state
  `Connect 2000NL to translate phrases.`;
- debug tools opened from the compact icon button and closed with Escape;
- readiness chip showed `Dutch captions · Ready` with a status dot;
- after the June 19 follow-up patch, the guided/passive header label uses
  `Phrase navigation` / `Watching` instead of `Shortcuts active` /
  `Passive sync`;
- the readiness/source popover opens upward from the bottom ribbon and stayed
  within the viewport in a focused Chrome check;
- the readiness/source popover includes inline helper copy explaining that
  `Get Captions` retrieves subtitle text while `Improve Timing` starts ASR
  alignment for tighter phrase boundaries;
- primary controls/source chip avoided technical source terms;
- phrase navigation rendered three icon controls for previous, replay, and next;
- `Improve Timing` opened as an enabled readiness action and showed operation
  feedback. On the current deployed API it failed closed with
  `Timing endpoint is unavailable on this AudioFilms API.`;
- dictionary panel ready state opened directly on cards, with clicked form and
  card count in the header;
- main ribbon account icon opened a popover with `Connect 2000NL` or
  `Disconnect`, and the dictionary header did not contain an account control;
- controlled dictionary-card fixture rendered three V2 cards:
  not-started/encountered with `Learn` and `Known`, reviewing with
  `Again`/`Hard`/`Good`/`Easy`, and frozen with no progress row;
- examples used explicit `Examples` expand/collapse controls and remembered the
  global expand/collapse state;
- card-level translate used a compact icon, toggled show/hide, and rendered the
  loaded translation block without breaking the panel;
- progress clicks rendered card-level feedback such as `Started learning` and
  `Hard recorded` without jumping back to the loading/context layout;
- light/dark/system theme override applied to the ribbon, dictionary, and
  floating `AudioFilms On/Off` toggle; the old `Phrase navigation` chip was
  hidden;
- wide and narrow panel geometry stayed within viewport.

Category: passing for the final UI slice.

Notes:

- Local `npm run build` lists `/api/dict/lookup` and
  `/api/practice/phrase-translations` as available routes.
- On June 19, 2026 the deployed `https://audiofilms-api.dilum.io` initially
  returned Next.js 404 HTML for `POST /api/dict/lookup`,
  `POST /api/practice/phrase-translations`, and
  `POST /api/practice/timing-jobs`. The Docker image was redeployed later that
  morning; those routes now return JSON.
- After redeploy, guest dictionary lookup returns `guest_lookup_unavailable`
  until `DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN` is configured. Signed-in
  forwarded-Bearer lookup remains the private dogfood path.
- After redeploy, `POST /api/practice/timing-jobs` returns `asr_unauthorized`
  without a tester token and accepts tester-token requests with operation JSON.
- The timing endpoint now checks reusable completed ASR jobs before spending a
  rate-limit slot. `reuseOnly=true` returns a cached ASR snapshot when present
  and returns `asr_cache_miss` without queueing work when absent. The extension
  uses this on normal caption load so cached ASR timing can become the default
  source at zero ASR cost.
- Full smoke still depends on live YouTube/remote-provider auto-caption
  availability. Current auto-caption fixtures can degrade to the previous
  working caption source when backend provider retrieval fails.
- Degraded caption errors now use learner-facing copy such as
  `AudioFilms fallback is off` or `AudioFilms fallback failed` instead of
  exposing `timedtext` or `backend provider` in the panel.

### 2026-06-16: Local ASR Extension Dogfood, Normal Chrome

Fixture: `RJrjzCuCHpo`.

Setup on the YouTube watch page:

```js
localStorage.afShadowingLocalAsr = "on";
localStorage.afShadowingLocalAsrTextSource = "asr";
localStorage.removeItem("afShadowingLocalAsrDuration");
```

Result:

- unpacked extension `hhdkchoccmikoefhenobdjipgdppdpoc` was reloaded;
- local ASR backend used the full video, not a 300-second window;
- boot state reported `selectedRetrievalPath: local-asr-backend`;
- source badge showed `Dutch · ASR · word-level · via local ASR · cached`;
- phrase count was initially `1 / 126`, then `1 / 125` after merging a zero-gap
  ASR continuation segment at `75.90-81.34`;
- first phrase was `Goedemiddag, dit is het NOS-journaal in makkelijke taal van woensdag 10 juni en ik ben Evita Maknak.`;
- Next advanced to `2 / 126`, entered `Shortcuts active`, and showed `In dit journaal gaat het over Nederlandse fans die naar het WK voetbal reizen.`;
- no visible load error.

Category: passing for local ASR extension dogfood.

### 2026-06-16: Practice Phrase Contract Count Update

Fixture: `4EE7m94mJpk&lang=nl&sourceKind=manual`.

Result:

- `/api/get-subs` returned `185` provider/source phrases and `189` backend-owned
  `practicePhrases`;
- the extension uses backend-owned `practicePhrases`, so smoke expectations for
  `4EE7m94mJpk` are now `189` visible practice phrases.

### 2026-06-11: Extension Smoke, Logged-In Normal Chrome

Fixture: `4EE7m94mJpk`.

Result:

- boot marker present;
- `videoId: 4EE7m94mJpk`;
- `captionTracksCount: 2`;
- visible video selected with non-zero box, finite duration, and `readyState: 4`;
- backend/provider returned `185` cues;
- source badge showed `Dutch · Manual · exact`;
- debug showed `sourceKind: manual` and `retrievalPath: backend-provider`;
- `qualityFlags` and `warnings` were empty after backend metadata alignment;
- compact UI rendered one phrase row.
- passive mode did not hijack playback;
- Replay entered `Shortcuts active` and paused at the selected phrase;
- AudioFilms Off removed `#audiofilms-root`; toggling On restored the extension.

Category: passing.

### 2026-06-11: SPA Navigation Smoke, Logged-In Normal Chrome

Fixture: `4EE7m94mJpk` -> `ZNQWWW-vvfM` -> `4EE7m94mJpk`.

Result:

- before navigation, `4EE7m94mJpk` showed `4 / 185`, `Dutch · Manual · exact`;
- after SPA navigation to `ZNQWWW-vvfM`, boot state reported `videoId: ZNQWWW-vvfM`, `captionTracksCount: 2`, `retrievalPath: backend-provider`, `4 / 149`, `Dutch · Manual · exact`;
- after navigating back to `4EE7m94mJpk`, boot state reported `videoId: 4EE7m94mJpk`, `captionTracksCount: 2`, `retrievalPath: backend-provider`, `5 / 185`, `Dutch · Manual · exact`;
- one phrase row remained rendered after each navigation.

Category: passing.

### 2026-06-11: Viewport Geometry Smoke, Logged-In Normal Chrome

Fixture: `4EE7m94mJpk`.

Result with Debug closed:

- wide viewport `1344 x 779`: ribbon measured about `760 x 160`, one phrase row, dictionary absent;
- after clicking a word at wide viewport, dictionary measured about `340 x 420` and stayed within viewport;
- narrow viewport `430 x 779` with dictionary open: ribbon measured about `383 x 238`, dictionary about `383 x 420`, both left `16` and within viewport;
- controls wrapped inside the narrow ribbon without exceeding viewport width.

Category: passing by DOM geometry. Screenshots are still useful before design review.

### 2026-06-11: Clean-Profile Boot And Screenshot Smoke

Fixture: `4EE7m94mJpk` in a temporary Chrome for Testing profile with the unpacked extension loaded.

Result:

- boot marker present;
- `videoId: 4EE7m94mJpk`;
- `captionTracksCount: 2`;
- `selectedRetrievalPath: backend-provider`;
- source badge `Dutch · Manual · exact`;
- count `1 / 185`;
- one phrase row rendered;
- consent dialog was dismissed in the temporary profile before final screenshots.

Captured screenshots:

- `docs/design-handoff/youtube-extension-expert-review/screenshots/SCR-20260611-cdp-clean-wide.png`;
- `docs/design-handoff/youtube-extension-expert-review/screenshots/SCR-20260611-cdp-clean-narrow.png`.

These screenshots are included in `docs/design-handoff/youtube-extension-expert-review/audiofilms-youtube-extension-expert-review.zip`.

Screenshot geometry:

- wide CDP viewport `1344 x 900`: ribbon about `760 x 160`;
- narrow CDP viewport about `445 x 930`: ribbon about `413 x 238`.

Category: passing.

### 2026-06-11: Local API Smoke

Fixture: `4EE7m94mJpk&lang=nl&sourceKind=manual`.

Result:

- API returned `185` phrases;
- `language: nl`;
- `meta.provider: supadata`;
- `meta.sourceKind: manual`;
- `meta.retrievalPath: supadata-manual`;
- `meta.timingExactness: exact`;
- `meta.qualityFlags: []`;
- `meta.warnings: []`.

Category: passing.

Additional API fixtures:

| Video ID | Result | Category |
| --- | --- | --- |
| `iDi5MhglYks` | `213` phrases, `language: nl`, `sourceKind: manual`, `retrievalPath: supadata-manual`, no warnings | passing |
| `ZNQWWW-vvfM` | `149` phrases, `language: nl`, `sourceKind: manual`, `retrievalPath: supadata-manual`, no warnings | passing |
| `KrdVIUmBoE4` | `162` phrases, `language: nl`, `sourceKind: manual`, `retrievalPath: yt-dlp-manual`, warning that primary provider was unavailable | passing provider-fallback fixture |
| `aircAruvnKk` | `286` phrases, `language: en`, `sourceKind: manual`, `retrievalPath: supadata-manual`, no warnings | passing non-Dutch manual fixture |
| `aircAruvnKk&lang=ar` | `217` phrases, `language: ar`, `sourceKind: manual`, `retrievalPath: supadata-manual`, no warnings | passing multilingual source-switch fixture |
| `xymyDvCgWDA` | `75` phrases, `language: nl`, `sourceKind: auto`, `retrievalPath: supadata-auto`, no API warnings | passing auto-caption-only fixture |
| `EColTNIbOko` | API returned HTTP `404`, `No subtitles found`, recoverable, suggested another language/video | passing no-captions fixture |

### 2026-06-11: Auto-Only And No-Captions Extension Smoke

Fixtures: `xymyDvCgWDA`, `EColTNIbOko`.

Result:

- `xymyDvCgWDA`:
  - yt-dlp JSON evidence: `manualCount: 0`, automatic Dutch tracks include `nl-orig` and `nl`;
  - extension detected `captionTracksCount: 1`;
  - source badge showed `Dutch (auto-generated) · Auto · exact · source warning`;
  - debug showed `sourceKind: auto`, `retrievalPath: backend-provider`;
  - phrase UI showed `1 / 29`;
  - quality flags included `overlap-cues` with warning `72 overlapping cues detected.`
- `EColTNIbOko`:
  - yt-dlp JSON evidence: `manualCount: 0`, `autoCount: 0`;
  - API returned HTTP `404` with `No subtitles found`;
  - extension detected `captionTracksCount: 0`;
  - UI showed `0 / 0`;
  - error was `No caption tracks found for this video.`;
  - empty-state UI now uses `No captions`, explanatory copy, and hides disabled playback controls.

Category: passing.

### 2026-06-11: Automated Multi-Video Chrome Smoke

Command:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --reload-extension
```

Fixture sequence:

1. `4EE7m94mJpk` manual Dutch captions.
2. `ZNQWWW-vvfM` legacy manual Dutch captions.
3. `iDi5MhglYks` app sample where browser-visible YouTube captions are auto-generated.
4. `KrdVIUmBoE4` manual captions where backend/provider falls back to `yt-dlp`.
5. `aircAruvnKk` multilingual video where English manual captions should be selected.
6. `aircAruvnKk` source switch from English manual captions to Arabic manual captions.
7. `xymyDvCgWDA` Dutch auto-caption-only.
8. `EColTNIbOko` no captions.
9. `4EE7m94mJpk` recovery from no-captions back to manual captions.
10. Synthetic SPA URL-change: `4EE7m94mJpk` -> `ZNQWWW-vvfM` -> `4EE7m94mJpk`.
11. Backend-off degraded state: `4EE7m94mJpk` with `localStorage.afShadowingBackendSubtitlesUrl = "off"`.
12. Backend-failed degraded state: `4EE7m94mJpk` with `localStorage.afShadowingBackendSubtitlesUrl` pointed at an unavailable localhost endpoint.
13. Failed source switch: `4EE7m94mJpk` manual source stays active when switching to auto-generated captions fails.
14. Viewport geometry: `4EE7m94mJpk` wide layout, wide layout with dictionary, and narrow layout with dictionary.

Result:

- all fifteen smoke fixtures passed;
- manual fixtures showed `Dutch · Manual · exact`, `backend-provider`, and expected phrase counts;
- app sample fixture showed `Dutch (auto-generated) · Auto · exact · source warning`, `backend-provider`, and `106` browser-visible auto phrases;
- provider-fallback fixture showed `Dutch · Manual · exact · source warning`, `backend-provider`, and `162` phrases;
- English multilingual fixture showed `English · Manual · exact`, `backend-provider`, and `271` extension phrase units;
- multilingual source-switch fixture loaded `Arabic · Manual · exact · source warning`, `backend-provider`, and `213` extension phrase units with Arabic text visible in the current phrase row;
- Arabic lookup checks passed: an Arabic word button was clicked, dictionary opened, selected word remained Arabic, and dictionary context preserved Arabic phrase text;
- auto-only fixture showed `Dutch (auto-generated) · Auto · exact · source warning`;
- no-captions fixture showed `No captions`, `0 / 0`, explanatory empty copy, and hidden playback controls;
- no-captions controls are now hidden with explicit DOM `hidden` state in addition to CSS, preventing stale disabled controls after long multi-video sequences;
- recovery fixture confirmed the no-captions empty state does not remain stuck after navigation back to a captioned video.
- Source-switch checks passed on `4EE7m94mJpk`:
  - source menu exposed both `Dutch` and `Dutch (auto-generated)`;
  - switching to auto-generated captions loaded `Auto · exact` with phrases and no visible error;
  - switching back restored `Manual · exact` and the expected phrase count.
- Replay interaction checks passed on manual, legacy manual, auto-only, and recovery fixtures:
  - mode changed to `Shortcuts active`;
  - the visible current phrase remained rendered;
  - the video seeked near the current phrase timestamp.
- Word lookup interaction checks passed on manual, legacy manual, auto-only, and recovery fixtures:
  - clicking the first lookup-capable word opened the dictionary panel;
  - the dictionary selected the clicked word;
  - the dictionary context retained the current phrase text;
  - the phrase row stayed rendered after dictionary open.
- No-captions fixture confirmed no dictionary panel appears in empty-state mode.
- `AudioFilms Off/On` checks passed on both captioned and no-captions states:
  - Off removed the Shadow DOM panel and changed the page toggle to `AudioFilms Off`;
  - On restored either phrase mode or compact empty-state mode as expected.
- Synthetic SPA URL-change checks passed:
  - URL changed without full document reload;
  - extension detected the new video id;
  - source badge, retrieval path, phrase count, and visible error state reset for `ZNQWWW-vvfM`;
  - returning to `4EE7m94mJpk` restored the original manual source and phrase count.
- Backend-off degraded-state checks passed:
  - YouTube timedtext empty response plus disabled backend produced `0 / 0`;
  - stale phrases were not shown;
  - playback controls and dictionary remained hidden;
  - visible error explained that timedtext was empty and backend fallback was disabled.
- Backend-failed degraded-state checks passed:
  - YouTube timedtext empty response plus unavailable backend produced `0 / 0`;
  - stale phrases were not shown;
  - playback controls and dictionary remained hidden;
  - visible error explained that timedtext was empty and backend provider failed.
- Failed source-switch checks passed:
  - manual captions were loaded before the failure;
  - switching to auto-generated captions with an unavailable backend did not replace the active manual source;
  - phrase count and phrase row stayed visible;
  - the failed auto-generated source option recorded the backend provider error.
- Viewport geometry checks passed:
  - wide layout kept the phrase panel and dictionary inside the viewport;
  - narrow layout stacked the phrase panel and dictionary inside the viewport;
  - visible controls stayed inside the phrase panel after wrapping.

Category: passing.

## Validation Maintenance

Phase 9's required fixture categories now have pinned examples and current smoke notes. Future validation should add more videos per category, but the current matrix is no longer blocked on absent auto-only or no-captions fixtures.
