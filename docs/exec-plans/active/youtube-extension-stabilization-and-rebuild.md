# YouTube Extension Stabilization And Rebuild

> Status note, June 18, 2026: this remains useful as an operational and
> architecture history for the extension spike/rebuild. Do not use its older
> visible badge examples, shortcut labels, or `No ASR pipeline` non-goal as the
> current product UI contract. The current learner-facing vocabulary and
> backend/UI contract are in `docs/intent/youtube-extension-designer-brief.md`
> and `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`.
> Any detailed UI phase below, including old `Show/Hide text` or auto-pause
> toggle language, is historical implementation evidence only.

## Goal

Turn the current YouTube shadowing extension spike into a stable, reviewable product direction without continuing to pile product code onto fragile YouTube DOM rewrites.

This plan is based on the expert review package and follow-up analysis prepared on June 10, 2026. The current extension is useful proof-of-concept evidence, but it should not be treated as the product architecture.

## Core Decision

Continue the extension path, but stop treating the extension as a replacement layout for YouTube.

The product direction is:

- minimal YouTube adapter,
- isolated AudioFilms learning UI,
- explicit transcript source and quality metadata,
- no default hiding, resizing, or replacing of YouTube page regions,
- transcript panel DOM parsing only as an isolated fallback/diagnostic path.

The extension should eventually do only these page-level jobs:

- detect the active YouTube watch video id,
- find the real visible video element,
- read and control playback time,
- discover browser-visible caption tracks where possible,
- render one isolated AudioFilms root,
- send retrieval and dictionary work through clear app/backend/service-worker boundaries.

## Non-Goals For This Cleanup

- No account system.
- No review grading or saved-word sync.
- No ASR pipeline.
- No Chrome Web Store packaging.
- No full reverse engineering of commercial extensions before the local architecture is clean.
- No attempt to make YouTube internal APIs stable by adding more selectors.

## Guiding Constraints

- Keep the main app and extension concerns separate until there is a deliberate shared-core step.
- Prefer removing YouTube layout mutations over making them more elaborate.
- Make degraded subtitle state visible instead of silently falling back.
- Keep the UI phrase-first: current phrase, replay, next, show/hide, click word.
- Keep every phase independently testable in a loaded unpacked extension.

## Phase 0: Freeze The Spike As Evidence

Purpose:

Create a clear line between the exploratory implementation and the rebuild.

Tasks:

- Keep `docs/exec-plans/active/youtube-shadowing-extension-mvp.md` as the historical spike/MVP plan.
- Keep the expert review bundle under `docs/design-handoff/youtube-extension-expert-review/`.
- Add a short note to `extensions/youtube-shadowing/README.md` that the current implementation is a spike pending stabilization.
- Do not delete the current behavior until the new root/adapter path can reproduce the basic phrase loop.

Exit criteria:

- A future agent can tell which document describes the old spike and which document describes the rebuild.
- No one needs to infer architecture direction from the current `content.js` shape.

## Phase 1: Make Extension Boot Reproducible

Purpose:

Before refactoring, prove whether the content script loads, crashes, or is blocked in a clean Chrome profile.

Progress notes, June 10, 2026:

- Added early boot sentinel and `window.__afShadowingBoot` diagnostics.
- Added top-level boot `try/catch` with a visible red failure badge.
- Added boot fields to debug copy state.
- Added README clean-profile checks.
- `node --check extensions/youtube-shadowing/src/content.js` passes.
- Automated CDP launch attempts from shell did not yet prove extension injection:
  - `open -na "Google Chrome" ... --load-extension=...` opened YouTube, but no AudioFilms globals appeared and the observed service worker was not from this manifest.
  - direct binary launch briefly opened the CDP port but exited before inspection in this desktop environment.
  - next validation should be a normal visible Chrome "Load unpacked" reload using the README checklist, or a more reliable browser automation profile that can keep Chrome alive with the unpacked extension loaded.
- Live visible Chrome check via AppleScript after reloading the YouTube tab found AudioFilms UI nodes (`#af-shadowing-toggle` and workspace panels), but no `documentElement.dataset.afShadowingBoot`. This suggests the page was still running an older already-loaded extension script. Refresh the unpacked extension itself on `chrome://extensions`, then reload the YouTube tab and re-check `dataset.afShadowingBootVersion`.
- The unpacked extension is recorded in local Chrome with stable manifest id `hhdkchoccmikoefhenobdjipgdppdpoc` and path `/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing`. Use `chrome://extensions/?id=hhdkchoccmikoefhenobdjipgdppdpoc` for the next visible refresh/check on this machine.
- The extension detail page exposes `#dev-reload-button`; clicking it via the page Shadow DOM successfully refreshed the unpacked extension without visible errors.
- After extension refresh and YouTube tab reload, `document.documentElement.dataset.afShadowingBoot === "1"` and `dataset.afShadowingBootVersion === "phase1-boot-diagnostics-2026-06-10"` appeared on the YouTube page. This proves current content script injection in the visible profile.
- `window.__afShadowingBoot` and `window.__afShadowingDebug` were not visible from AppleScript/page context even after successful injection because Chrome content scripts run in an isolated world. Mirror diagnostics into `dataset.afShadowingBootState` for page-readable validation.
- After mirroring diagnostics into `dataset.afShadowingBootState` and refreshing the extension again, the visible YouTube tab reported:
  - `contentScriptLoaded: true`;
  - `bootFailed: false`;
  - `extensionId: hhdkchoccmikoefhenobdjipgdppdpoc`;
  - `watchPageDetected: true`;
  - `videoIdDetected: 4EE7m94mJpk`;
  - `videoElementDetected: true`;
  - `captionTracksCount: 2`.
- The same run later reported `lastError` from subtitle retrieval: timedtext empty responses, transcript API HTTP 400 precondition failure, and transcript panel timed segments unavailable. This is a retrieval/fallback issue, not a boot issue.

Tasks:

- Add an early boot sentinel before the main extension logic:
  - `document.documentElement.dataset.afShadowingBoot = "1"`;
  - a concise console line with URL and extension id.
- Wrap top-level boot in `try/catch`.
- On boot failure, render a tiny fixed diagnostic badge with the error message.
- Add a dev-only debug state that records:
  - content script loaded,
  - watch page detected,
  - video id detected,
  - video element detected,
  - caption tracks count,
  - selected retrieval path,
  - last error.
- Document clean-profile validation steps in `extensions/youtube-shadowing/README.md`.

Exit criteria:

- In a fresh loaded-unpacked Chrome profile, the page visibly shows either `AudioFilms Off/On` or a small diagnostic failure badge.
- If nothing appears, `chrome://extensions` and console errors are enough to distinguish "not injected" from "injected and crashed".
- The clean-profile issue from the handoff package is either reproduced with evidence or closed with evidence.

## Phase 2: Split The Monolith Without Changing Product Behavior

Purpose:

Make the codebase understandable before changing UX. The current `content.js` mixes YouTube metadata extraction, transcript fallback automation, cue parsing, phrase building, player control, UI rendering, keyboard capture, storage, dictionary placeholders, and debug behavior.

Progress notes, June 10, 2026:

- First no-behavior split completed: boot diagnostics moved to `extensions/youtube-shadowing/src/bootDiagnostics.js`.
- Second no-behavior split completed: cue-to-phrase building moved to `extensions/youtube-shadowing/src/phrases.js`.
- Third no-behavior split completed: caption track/source helpers moved to `extensions/youtube-shadowing/src/captionTracks.js`.
- Fourth no-behavior split completed: watch URL, player metadata parsing, balanced JSON extraction, and video element lookup moved to `extensions/youtube-shadowing/src/youtubeAdapter.js`.
- Fifth no-behavior split completed: timedtext retrieval, transcript API retrieval, transcript-panel fallback, and cue parsers moved to `extensions/youtube-shadowing/src/transcriptRetrieval.js`.
- `manifest.json` now loads `src/bootDiagnostics.js`, then `src/phrases.js`, then `src/captionTracks.js`, then `src/youtubeAdapter.js`, then `src/transcriptRetrieval.js`, then `src/content.js`.
- `content.js` uses `window.__afShadowingBootDiagnostics` and retains a minimal fallback if script order breaks.
- `content.js` uses `window.__afShadowingPhrases` and retains a minimal fallback if script order breaks.
- `content.js` uses `window.__afShadowingCaptionTracks` and retains a minimal fallback if script order breaks.
- `content.js` uses `window.__afShadowingYouTubeAdapter` and retains a minimal fallback if script order breaks.
- `content.js` uses `window.__afShadowingTranscriptRetrieval` for current retrieval orchestration.
- Live Chrome validation after extension reload confirmed `dataset.afShadowingBootVersion` and `dataset.afShadowingBootState` still publish correctly after these splits. It also confirmed the known retrieval failure is preserved after the transcript retrieval extraction and is now isolated to `src/transcriptRetrieval.js`.

Initial no-build split:

- `src/bootDiagnostics.js`: boot sentinel, page-readable diagnostics, and visible boot failure badge. Completed first because it makes the remaining split observable.
- `src/boot.js`: boot orchestration and navigation watcher.
- `src/state.js`: state shape and simple state helpers.
- `src/youtubeAdapter.js`: watch URL, video id, player response extraction, visible video element selection. Initial extraction completed during early Phase 2 split.
- `src/captionTracks.js`: caption track discovery, source labels, source grouping, and source debug formatting. Completed as part of early Phase 2 split.
- `src/transcriptRetrieval.js`: timedtext retrieval, transcript API retrieval, transcript-panel fallback, and cue parsers. Initial extraction completed during early Phase 2 split.
- `src/transcriptPanelFallback.js`: all YouTube transcript-panel selectors and clicking logic. Deferred as a possible follow-up split; currently lives inside `src/transcriptRetrieval.js`.
- `src/cues.js`: JSON3/VTT/SRV3 cue parsing and normalization. Deferred as a possible follow-up split; currently lives inside `src/transcriptRetrieval.js`.
- `src/phrases.js`: phrase builder.
- `src/playerController.js`: seek/play/pause/current phrase stopping.
- `src/ui.js`: temporary current UI renderer.
- `src/keyboard.js`: scoped keyboard handling.
- `src/debug.js`: debug log and copy payload.

Manifest can load these scripts in order as separate content script files. A build step can be reconsidered later, but it is not required for this phase.

Exit criteria:

- Each file has one obvious responsibility.
- The extension still performs the current basic phrase navigation on at least one known captioned video.
- Transcript panel selectors are isolated in one fallback module.
- UI rendering no longer sits in the same file as caption retrieval and player control.

## Phase 3: Introduce A Typed Transcript Result

Purpose:

Stop losing source truth during fallback.

Replace "return cues and set `state.cueSource`" with a result object:

```ts
type TranscriptResult = {
  cues: Cue[];
  sourceKind: "manual" | "auto" | "transcript-panel" | "provider" | "asr" | "unknown";
  retrievalPath: "timedtext-json3" | "timedtext-vtt" | "timedtext-srv3" | "youtubei-transcript" | "transcript-dom" | "backend-provider";
  selectedTrackId?: string;
  actualTrackId?: string;
  languageCode?: string;
  timingExactness: "exact" | "inferred-end" | "approximate" | "word-level";
  qualityFlags: string[];
  warnings: string[];
};
```

Progress notes, June 11, 2026:

- `extensions/youtube-shadowing/src/transcriptRetrieval.js` now returns a `TranscriptResult` from `fetchBestAvailableCues(track)`.
- Timedtext success is reported as `timedtext-json3`, `timedtext-vtt`, or `timedtext-srv3` with `sourceKind` derived from the selected YouTube track (`manual` or `auto`).
- YouTube transcript API fallback and transcript DOM fallback are marked as `source-unverified` with warnings that the selected source may differ.
- Basic quality measurements now flag duplicate cues, overlapping cues, inferred end times, unusually long cues, and rolling-caption-like streams.
- `content.js` stores the result on `state.transcriptResult`, mirrors a compact summary onto the loaded practice source, includes it in debug copy, and renders a source badge such as `Manual · exact`, `Auto · exact`, or `Transcript fallback · rough timing`.
- Source switching remains enabled, but source-unverified fallback is no longer silent: the selector and source menu show a warning when the loaded fallback cannot prove it matched the selected track.
- Live Chrome validation on `https://www.youtube.com/watch?v=4EE7m94mJpk` still shows the known retrieval failure after extension reload: boot succeeds, video and 2 caption tracks are detected, but timedtext returns empty responses, YouTube transcript API returns HTTP 400, and transcript DOM fallback does not expose timed segments. This confirms Phase 3 metadata changes did not fix retrieval itself; they prepare successful/fallback loads to be reported truthfully.

Tasks:

- Make `fetchBestAvailableCues(track)` return a `TranscriptResult`. Completed in the extension spike.
- Mark non-track-aware transcript fallback with `sourceMismatch`. Implemented as `source-unverified`; rename to `sourceMismatch` later if the stricter flag name is still preferred.
- Disable source switching or clearly warn when fallback cannot prove it loaded the selected track. Warning path implemented.
- Add duplicate, overlap, inferred-end, long-cue, and rolling-caption measurements. Initial measurements implemented.
- Add a compact UI badge such as `Manual · exact`, `Auto · rough timing`, or `Transcript fallback · source may differ`. Initial badge implemented in the source selector.

Exit criteria:

- The user can see when captions are manual, auto, provider, or fallback.
- The app never silently shows one source while the selector claims another.
- Debug copy includes source, quality, and warnings.

## Phase 4: Replace YouTube Layout Mutation With An Isolated Root

Purpose:

Move toward the product architecture: a minimal adapter plus a self-owned learning layer.

Tasks:

- Create a single `#audiofilms-root` attached to `document.documentElement`.
- Render extension UI inside a Shadow DOM root.
- Move nearly all CSS into the shadow root.
- Keep global CSS limited to the root host and, if absolutely required, one or two safe fixed-position helpers.
- Remove default behavior that:
  - resizes YouTube player/video,
  - prepends dictionary UI into `#secondary`,
  - inserts the ribbon after `#player`,
  - hides recommendations,
  - globally hides YouTube transcript text.
- Keep any transcript-panel DOM manipulation behind explicit fallback/debug mode.

Progress notes, June 11, 2026:

- First isolated-root step completed: `content.js` now creates a single `#audiofilms-root` attached to `document.documentElement`.
- Dictionary and ribbon panels are mounted inside `#audiofilms-root` instead of being prepended into YouTube `#secondary` or inserted after `#player`.
- Default CSS no longer resizes YouTube player/video and no longer hides `#secondary` recommendations.
- Second isolated-root step completed: `#audiofilms-root` now owns an open Shadow DOM and mounts the ribbon/dictionary inside `#audiofilms-shadow-container`.
- `shadow.css` is loaded into the shadow root through `chrome.runtime.getURL("src/shadow.css")`; `manifest.json` exposes that CSS through `web_accessible_resources`.
- Global `content.css` is now reduced to the page toggle, root helper state, and deliberate transcript debug/highlight selectors. It no longer contains ribbon, dictionary, source-menu, or panel layout selectors.
- Live Chrome validation on `https://www.youtube.com/watch?v=4EE7m94mJpk` confirmed:
  - `#audiofilms-root` exists;
  - `#audiofilms-root.shadowRoot` exists;
  - ribbon and dictionary panel parent is `audiofilms-shadow-container`;
  - `document.querySelector("#af-shadowing-ribbon-panel")` is false because the panel is inside Shadow DOM;
  - shadow CSS loaded (`style[data-af-shadow-style]`, length about 12.6 KB);
  - shadow CSS variables applied (`--af-bg: #0b1117`) and ribbon computed background is `rgb(11, 17, 23)`;
  - YouTube `#secondary` does not contain the dictionary panel;
  - backend-provider still loads 185 Dutch phrases;
  - UI shows `Dutch · Provider · exact · source warning`.
- CSS isolation cleanup completed for the current spike UI: `content.css` is now a minimal global helper stylesheet for the toggle, host state, and deliberate transcript debug/highlight selectors. Panel styling lives in `shadow.css` and is loaded into Shadow DOM.

Exit criteria:

- Turning AudioFilms on does not change YouTube layout by default.
- Turning AudioFilms off removes the root and leaves YouTube visually normal.
- YouTube recommendations remain visible unless a future explicit Focus mode is added.
- Extension CSS cannot accidentally restyle YouTube controls or transcript nodes.

## Phase 5: Redesign The Extension UI Around A Compact Phrase Layer

Purpose:

Replace the heavy "dark workspace inside YouTube" with a small learning control surface.

Default UI:

- One compact phrase bar near the video:
  - current phrase text or hidden state,
  - phrase count,
  - source/quality badge,
  - Replay,
  - Previous,
  - Next,
  - Show/Hide text,
  - Auto-pause toggle if guided mode is active.
- One small AudioFilms pill/toggle.

Lookup UI:

- Click word in the visible phrase.
- Show a popover near the word or a compact right drawer.
- Do not replace YouTube recommendations by default.
- Do not show 2000NL account/review placeholders until account wiring exists.

Progress:

- The default overlay now renders one compact current-phrase row instead of a multi-row transcript ribbon.
- Previous, Replay, Show/Hide text, Next, Auto-pause, Debug, and Copy controls remain available in the compact bar.
- The dictionary panel is not mounted by default. It appears only after the user clicks a word in the current phrase.
- The permanent 2000NL account placeholder is removed from the default screen. The selected-word card still uses placeholder dictionary/review content and needs real lookup wiring before product use.
- Chrome smoke on `https://www.youtube.com/watch?v=4EE7m94mJpk` after reloading the unpacked extension:
  - Shadow DOM root and ribbon are present;
  - dictionary panel is absent before word click;
  - one phrase row is rendered;
  - source badge remains `Dutch · Provider · exact · source warning`;
  - backend/provider path still yields 185 phrases;
  - compact ribbon measured about `760 x 160` px;
  - clicking a word opens the dictionary panel and keeps one phrase row rendered.

Optional later UI:

- Transcript/list drawer.
- Focus layout that intentionally covers recommendations.
- Chrome Side Panel for dictionary/account if the extension grows beyond a lightweight overlay.

Exit criteria:

- The extension screen is usable without reading instructions.
- The current phrase is the visual center.
- The UI does not occupy 25 percent of the viewport by default.
- Screenshots are clearly better than the current extension screenshot and closer in product clarity to the main web app screenshot.

## Phase 6: Harden Playback And Keyboard Behavior

Purpose:

Make phrase playback predictable without hijacking normal YouTube behavior.

Tasks:

- Replace broad `document.querySelector("video")` with a visible YouTube video selector:
  - visible bounding box,
  - finite duration,
  - usable ready state,
  - not hidden/ad-only if detectable.
- Make auto-pause active only in explicit guided phrase mode.
- Simplify phrase stop logic:
  - one primary `requestAnimationFrame` loop during active phrase playback,
  - optional `timeupdate` only for passive sync.
- Scope keyboard capture to active AudioFilms mode.
- Avoid global `stopImmediatePropagation()` unless a specific key and state require it.
- Add visible indication when keyboard shortcuts are active.
- Add a manual navigation incident marker so bad Replay/Previous/Next behavior can be reported with exact playback and phrase context.

Progress:

- `youtubeAdapter.getVideoElement()` now prefers a visible, connected, metadata-ready YouTube video with finite duration and a meaningful bounding box before falling back to any visible video.
- Passive playback now syncs the current phrase but does not auto-pause normal YouTube playback.
- Replay/Next/Previous enter explicit guided mode. Guided mode is shown in the compact bar as `Shortcuts active`; passive mode is shown as `Passive sync`.
- Active phrase replay now uses a single `requestAnimationFrame` loop for phrase-end enforcement. The previous interval plus active `timeupdate` stop loop was removed.
- Guided phrase navigation now advances from the visible selected phrase in the AudioFilms panel, not from the YouTube playhead. This keeps Previous/Next deterministic near phrase boundaries and during quick repeated clicks.
- Space now exits guided phrase playback and toggles normal continuous YouTube play/pause. ArrowLeft/ArrowRight remain Previous/Next, and ArrowDown replays the current visible phrase.
- `Mark Issue` copies a navigation incident report with the current phrase, selected source, playback snapshot, recent navigation commands, and delayed observations after recent seeks.
- Chrome smoke on `https://www.youtube.com/watch?v=4EE7m94mJpk` after reloading the unpacked extension:
  - boot diagnostics report a detected video element and `backend-provider`;
  - passive mode advanced from phrase `6 / 185` to `14 / 185` while the video continued playing;
  - Replay changed the visible mode to `Shortcuts active`;
  - guided replay paused the video at the selected phrase;
  - clicking Auto-Pause changed the mode back to `Passive sync` and the button to `Auto-Pause Off`.

Exit criteria:

- Normal YouTube playback remains normal when AudioFilms is off or not in guided mode.
- Replay/Next/Previous seek to the expected phrase consistently.
- Space handling no longer feels like an invisible global override.
- Manual misses can be reported with a copied `Mark Issue` payload rather than prose-only reproduction.

## Phase 7: Rebuild Retrieval Ladder Deliberately

Purpose:

Keep the useful data-plane discoveries while removing misleading fallback behavior.

Target ladder:

1. Browser-visible selected caption track via `captionTrack.baseUrl` and `timedtext`.
2. Backend/provider API for the same `videoId`, language, and requested source kind.
3. YouTube transcript endpoint/panel fallback only when clearly labeled and preferably track-aware.
4. ASR only as a future explicit expensive fallback.

Progress notes, June 11, 2026:

- Probed the current YouTube watch page directly from page JavaScript for `https://www.youtube.com/watch?v=4EE7m94mJpk`.
- Confirmed the player exposes two caption tracks (`Dutch` manual and `Dutch (auto-generated)`) with signed `api/timedtext` `baseUrl` values.
- Confirmed direct page-world fetches to the signed `timedtext` URL return HTTP 200 with an empty body for the base URL, `fmt=json3`, `fmt=vtt`, and `fmt=srv3`. This makes the current failure a YouTube data-plane behavior, not a content-script fetch or parser bug.
- Confirmed the page's `getTranscriptEndpoint` request returns HTTP 400 `FAILED_PRECONDITION` from page-world fetch with the current `ytcfg` context.
- Confirmed transcript DOM can expose old `ytd-transcript-segment-renderer` nodes after a successful visible transcript open, but synthetic fallback clicks can also leave YouTube in a selected-but-empty transcript panel state.
- Added `extensions/youtube-shadowing/src/pageBridge.js` as a minimal `world: "MAIN"` bridge so the isolated content script can ask page-world code to click a visible `Show transcript` button. This proves the bridge path works (`ok: true` result), but it does not yet make the transcript panel state machine reliable on the current video.
- Removed retry clicks on the right-side `Transcript` tab because they do not load timed segments and can preserve the empty panel state.
- Replaced blind transcript-panel retry logging with explicit panel state diagnostics: old segment count, modern segment count, visible show/close buttons, selected transcript tabs, active panel text, modern spinner panels, and scroll position.
- Live Chrome validation after this change still fails to retrieve DOM cues on the current video, but now reports the concrete state: `old=0, modern=0, showButtons=1, closeButtons=0, selectedTabs=1, modernSpinners=1`. This confirms the fallback is stuck in a selected transcript panel with a modern spinner, not in a simple selector mismatch.
- Current conclusion: transcript DOM remains useful as a diagnostic/last-resort path, but should not be promoted as a reliable product fallback without a more substantial YouTube panel state machine or a backend/provider fallback.
- Added a backend/provider fallback before YouTube transcript endpoint and DOM fallback. The extension now calls the local AudioFilms app's `/api/get-subs` through a Chrome extension service worker, so the request is made from the extension origin instead of the YouTube page origin.
- Added `extensions/youtube-shadowing/src/serviceWorker.js` and localhost host permissions for `http://localhost:*/*` and `http://127.0.0.1:*/*`.
- Backend fallback is configurable with `localStorage.afShadowingBackendSubtitlesUrl`; setting it to `off` disables the path. The default endpoint is `http://localhost:3000/api/get-subs`.
- Live Chrome validation on `https://www.youtube.com/watch?v=4EE7m94mJpk` with the local app running returned 185 Dutch phrases through `backend-provider`/`supadata`. The UI showed `Dutch · Provider · exact · source warning`, `phrases: 185`, `selectedRetrievalPath: backend-provider`, and no load error.
- Backend provider fallback is still marked with `source-kind-unverified` because the provider proves language and timing, but not whether the selected YouTube source was manual or auto-generated.

Tasks:

- Keep timedtext as the extension primary path for browser-visible captions.
- Add a backend fallback only after the extension has typed quality metadata. Completed for local AudioFilms `/api/get-subs` via extension service worker.
- Use transcript panel DOM fallback as diagnostic or last-resort mode. In progress: page-world click bridge added, but the fallback still needs a more deliberate state machine for empty/selected transcript panels.
- Preserve raw segment metadata where possible, including JSON3 segment offsets.
- Rework phrase builder limits:
  - max duration,
  - max words,
  - max characters,
  - sentence/punctuation boundaries,
  - long pause boundary.

Progress, continued:

- The retrieval result now carries `retrievalAttempts`, so debug output explains the ladder instead of only showing the final source.
- Backend/provider requests now include requested `sourceKind=manual|auto` in addition to `videoId` and `lang`.
- Backend/provider results still receive `source-kind-unverified` when the provider does not return a source kind. If it later returns a mismatched source kind, the extension will flag `source-kind-mismatch`.
- YouTube transcript API and DOM fallback are now diagnostic-only by default. They are skipped unless `localStorage.afShadowingTranscriptFallback = "on"`.
- JSON3 cue parsing now preserves per-cue raw segment text and `tOffsetMs` where YouTube provides it.
- Phrase building now has explicit max duration, max words, max characters, punctuation, and long-pause boundaries.
- Chrome smoke on `https://www.youtube.com/watch?v=4EE7m94mJpk` after reloading the unpacked extension:
  - source badge remained `Dutch · Provider · exact · source warning`;
  - phrase count remained `185`;
  - debug attempts showed `timedtext` failed with empty json3/vtt/srv3 responses;
  - debug attempts then showed `backend-provider` succeeded with `185` cues;
  - quality flags remained `source-kind-unverified`, which matches the current backend response.

Exit criteria:

- Retrieval decisions are explainable from debug output and UI badge.
- A source selector failure leaves the previous source active and marks the tried source failed.
- Bad timing is labeled as degraded instead of appearing as a playback bug.

## Phase 8: Align With The Main Web App

Purpose:

Avoid two separate products solving the same transcript and phrase problems in incompatible ways.

Tasks:

- Compare extension `Cue`, `Phrase`, `TranscriptResult`, and quality flags with `app/src/types/subtitles.ts`.
- Extend app subtitle metadata to support source and quality fields.
- Decide whether to create a shared subtitle core:
  - either a small `app/src/lib/practice/` module first,
  - or a repo-level shared package later if the extension gets a build step.
- Align tokenization:
  - use Unicode-aware lookup tokenization,
  - consider `Intl.Segmenter` with regex fallback.
- Keep dictionary provider orchestration in the app/backend path, not embedded in YouTube page UI.

Progress:

- Extended `app/src/types/subtitles.ts` with shared subtitle metadata vocabulary:
  - `SubtitleSourceKind`;
  - `SubtitleTimingExactness`;
  - `SubtitleQualityFlag`;
  - `SubtitleRetrievalAttempt`;
  - `SubtitleQualityMeta`;
  - optional metadata fields on `SubtitleResponse.meta` and `SubtitleFetchResult`.
- `/api/get-subs` now accepts `sourceKind=manual|auto` and passes it into provider options.
- `loadSubtitles` now includes source kind in the subtitle cache key and propagates provider source/quality metadata into API responses.
- Supadata and yt-dlp providers now return detectable `manual`/`auto` source kind, retrieval path, exact timing, quality flags, and warnings.
- Added canonical app practice phrase normalization in `app/src/lib/practice/phrases.ts`.
- `WatchClient` now imports the shared app normalizer instead of carrying its own local phrase-splitting functions.
- Added `docs/intent/subtitle-practice-contract.md` as the current app/extension contract while the extension remains a no-build spike.
- Updated extension backend-provider handling so backend-returned `manual`/`auto` becomes `sourceKind`, while `retrievalPath` remains `backend-provider`.
- Validation:
  - `npm run lint` passes in `app/`;
  - `npm run build` passes in `app/`;
  - all extension JS files pass `node --check`;
  - local API smoke for `4EE7m94mJpk&lang=nl&sourceKind=manual` returned `meta.sourceKind: manual`, `retrievalPath: supadata-manual`, `timingExactness: exact`, and `185` phrases;
  - Chrome smoke after unpacked extension reload showed `Dutch · Manual · exact`, `sourceKind: manual`, `retrievalPath: backend-provider`, and no quality warnings.

Exit criteria:

- Extension and app can describe subtitle source/quality the same way.
- Phrase building behavior is intentionally shared or intentionally different.
- Word lookup sends phrase context and language consistently.

## Phase 9: Validation Matrix

Purpose:

Stop testing only the happy path.

Fixture set:

- NOS manual Dutch captions.
- Dutch auto-caption-only video.
- Video with no captions.
- Video with captions where direct `timedtext` returns empty.
- Video after YouTube SPA navigation from one watch page to another.
- Logged-out clean Chrome profile.
- Logged-in normal Chrome profile.
- Different viewport widths.

Checks:

- boot indicator appears,
- video id detected,
- visible video selected,
- caption tracks detected,
- selected source shown,
- retrieval path shown,
- phrase list non-empty when expected,
- replay stops near phrase end,
- source mismatch warning appears when fallback cannot prove track identity,
- AudioFilms off restores YouTube visuals.

Progress:

- Added `docs/intent/youtube-extension-validation-matrix.md` with:
  - failure categories (`boot`, `youtube-adapter`, `retrieval`, `phrase-building`, `player-control`, `ui`);
  - required extension and API checks;
  - fixture table;
  - latest run notes;
  - validation maintenance notes.
- API smoke via local `http://localhost:3000/api/get-subs`:
  - `4EE7m94mJpk&lang=nl&sourceKind=manual`: passing, `185` phrases, `sourceKind: manual`, `retrievalPath: supadata-manual`;
  - `iDi5MhglYks&lang=nl&sourceKind=manual`: passing, `213` phrases, `sourceKind: manual`, `retrievalPath: supadata-manual`;
  - `ZNQWWW-vvfM&lang=nl&sourceKind=manual`: passing, `149` phrases, `sourceKind: manual`, `retrievalPath: supadata-manual`;
  - `KrdVIUmBoE4&lang=nl&sourceKind=manual`: passing via `yt-dlp` fallback, `162` phrases, `sourceKind: manual`, `retrievalPath: yt-dlp-manual`, warning that the primary provider was unavailable.
  - `aircAruvnKk&lang=en&sourceKind=manual`: passing, `286` phrases, `sourceKind: manual`, `retrievalPath: supadata-manual`.
- Chrome smoke on `4EE7m94mJpk` in the logged-in normal Chrome profile:
  - boot marker present;
  - video id detected;
  - 2 caption tracks detected;
  - visible video selected with finite duration and `readyState: 4`;
  - source badge `Dutch · Manual · exact`;
  - debug retrieval path `backend-provider`;
  - one compact phrase row rendered;
  - Replay entered guided mode and paused at the selected phrase;
  - AudioFilms Off removed the Shadow DOM root and On restored it.
- SPA navigation smoke in the same profile:
  - `4EE7m94mJpk` -> `ZNQWWW-vvfM` reset video id, tracks, retrieval path, phrase count, and source badge;
  - `ZNQWWW-vvfM` -> `4EE7m94mJpk` reset the same state back to the original fixture.
- Viewport DOM-geometry smoke with Debug closed:
  - wide viewport `1344 x 754`: ribbon about `760 x 160`, one phrase row, dictionary absent;
  - narrow viewport `430 x 754`: ribbon about `398 x 238`, left/right inside viewport, controls wrapped inside the panel.
- Clean-profile Chrome for Testing smoke with unpacked extension:
  - boot marker present;
  - `videoId: 4EE7m94mJpk`;
  - `captionTracksCount: 2`;
  - `selectedRetrievalPath: backend-provider`;
  - source badge `Dutch · Manual · exact`;
  - count `1 / 185`;
  - one phrase row rendered.
- Captured clean-profile screenshots for design/expert review:
  - `docs/design-handoff/youtube-extension-expert-review/screenshots/SCR-20260611-cdp-clean-wide.png`;
  - `docs/design-handoff/youtube-extension-expert-review/screenshots/SCR-20260611-cdp-clean-narrow.png`.
- Rebuilt expert review archive:
  - `docs/design-handoff/youtube-extension-expert-review/audiofilms-youtube-extension-expert-review.zip`;
  - includes current split extension source, current app subtitle/provider files, validation matrix, subtitle practice contract, active plan, old comparison screenshots, and new clean compact UI screenshots.
- Pinned the remaining required fixtures:
  - auto-caption-only: `xymyDvCgWDA` (`yt-dlp` evidence: `manualCount: 0`, Dutch automatic tracks available);
  - no-captions: `EColTNIbOko` (`yt-dlp` evidence: `manualCount: 0`, `autoCount: 0`).
- API smoke:
  - `xymyDvCgWDA&lang=nl&sourceKind=auto`: `75` phrases, `sourceKind: auto`, `retrievalPath: supadata-auto`;
  - `EColTNIbOko&lang=en&sourceKind=manual`: HTTP `404`, `No subtitles found`, recoverable.
- Extension smoke:
  - `xymyDvCgWDA`: `captionTracksCount: 1`, `Dutch (auto-generated) · Auto · exact · source warning`, `1 / 29`, `overlap-cues`;
  - `EColTNIbOko`: `captionTracksCount: 0`, `0 / 0`, `No caption tracks found for this video.`
- Fixed local app provider fallback path detection so the no-subtitles fixture can use the installed Homebrew `yt-dlp` fallback when `YT_DLP_PATH` is not set.
- Re-ran local validation after the provider fallback and `NOT_FOUND` preservation changes:
  - `npm run lint` passed from `app/`;
  - `npm run build` passed from `app/`;
  - `node --check` passed for every extension script in `extensions/youtube-shadowing/src/`.
- Rebuilt and integrity-checked the expert review archive again after the latest validation notes:
  - `docs/design-handoff/youtube-extension-expert-review/audiofilms-youtube-extension-expert-review.zip`;
  - `unzip -t` reported no compressed data errors.
- Expanded Chrome smoke to cover broader reliability classes:
  - `KrdVIUmBoE4` now verifies primary-provider-unavailable fallback with a visible source warning;
  - backend-off and backend-failed scenarios verify compact degraded states without stale phrases;
  - failed source switching verifies a broken newly selected source does not replace the previous working source;
  - `aircAruvnKk` verifies multilingual/non-Dutch caption handling, source switching from English to Arabic manual captions, and Arabic word lookup/dictionary context.
- Fixed default source selection so multilingual videos prefer `navigator.languages`, then `nl`, then `en`, before falling back to arbitrary YouTube track order. This prevented `aircAruvnKk` from defaulting to the first manual track (`Arabic`) when English manual captions were available.
- Fixed empty/degraded state controls so playback buttons are hidden via DOM `hidden` state in addition to Shadow CSS. This closed a full-smoke regression where the no-captions fixture showed disabled controls after several captioned/multilingual videos.

Exit criteria:

- Each fixture has documented pass/fail notes. Status: done for manual, auto-only, missing-subs, SPA navigation, clean-profile boot, and viewport smoke.
- Known failures are categorized as boot, YouTube adapter, retrieval, phrase building, player control, or UI. Status: done in `docs/intent/youtube-extension-validation-matrix.md`.
- No new product work starts while the clean-profile boot path is unknown. Status: clean-profile boot path is now known and documented.

## Phase 10: Research Other Extensions With A Narrow Brief

Purpose:

Use other extensions for patterns, not as a substitute for local architecture.

Research order:

1. SubtideX for transcript-panel extraction patterns.
2. EasySubs for word lookup, subtitle controls, and pause/resume UX.
3. multi-subs-yt for minimal injection posture.
4. Language Reactor and Migaku for product/UI patterns, not internal API contracts.

Research questions:

- Do they avoid moving YouTube layout nodes?
- Do they use overlay, drawer, side panel, or replacement layout?
- How do they expose subtitle source and quality?
- How do they scope keyboard shortcuts?
- What is their fallback behavior when subtitles are missing or blocked?

Exit criteria:

- Findings are recorded in a short note under `docs/design-handoff/` or `docs/intent/`.
- Only concrete patterns are brought back into implementation.

Status:

- Added `docs/design-handoff/youtube-extension-expert-review/RELATED_EXTENSION_RESEARCH_RU.md`.
- Covered:
  - SubtideX for transcript-panel and InnerTube extraction patterns;
  - EasySubs for word lookup, hover/pause, keyboard movement, and YouTube timedtext capture;
  - multi-subs-yt for minimal injection, popup activation, playerResponse/captionTracks, and `<track>` insertion;
  - Language Reactor and Migaku as product/UI references, not internal API contracts;
  - official YouTube Data API captions docs as a constraint check.
- Concrete implementation direction from research:
  - keep Shadow DOM/isolated UI;
  - avoid moving or replacing YouTube layout nodes by default;
  - keep compact phrase bar plus contextual dictionary;
  - keep backend/provider fallback as first-class;
  - keep transcript-panel/InnerTube scraping as diagnostic/manual fallback until proven stable;
  - keep keyboard shortcuts scoped to guided mode.

## Recommended Execution Order

1. Phase 0: freeze and label the spike.
2. Phase 1: boot diagnostics and clean-profile reproducibility.
3. Phase 2: split the monolith without UI changes.
4. Phase 3: typed transcript result and quality metadata.
5. Phase 4: isolated Shadow DOM root.
6. Phase 5: compact phrase UI.
7. Phase 6: player and keyboard hardening.
8. Phase 7: retrieval ladder cleanup.
9. Phase 8: app alignment/shared core decision.
10. Phase 9: validation matrix.
11. Phase 10: targeted external extension research.

## Stop Conditions

Pause implementation and reassess if:

- clean-profile boot cannot be made reproducible,
- YouTube caption track discovery fails on most target videos,
- fallback retrieval keeps producing source mismatches that cannot be explained to users,
- the extension requires broad YouTube layout rewrites to feel usable,
- the main web app route delivers the same learning value with much lower fragility.

## First Concrete Work Item

Start with Phase 1 only:

- add boot sentinel,
- add top-level error boundary,
- add visible failure badge,
- document clean-profile validation,
- test one known NOS video in a fresh profile.

Do not redesign the UI or split the monolith before the extension boot path is observable.
