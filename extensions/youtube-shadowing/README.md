# YouTube Shadowing Extension

Chrome extension spike for phrase-by-phrase YouTube listening practice.

## Status

This is a post-review spike, not product architecture. The next stabilization path is tracked in:

```text
docs/exec-plans/active/youtube-extension-stabilization-and-rebuild.md
```

Current cleanup has passed boot reproducibility, code splitting, retrieval metadata, provider fallback, Shadow DOM isolation, the first compact UI pass, playback/keyboard hardening, deliberate retrieval-ladder work, and the first app/extension metadata alignment pass.

Operational handoff for agents is in:

```text
docs/intent/youtube-extension-agent-runbook.md
```

## Purpose

This extension validates whether AudioFilms can run directly on YouTube pages, use the caption tracks already available to the YouTube player, and replace rough time seeking with phrase navigation.

## MVP Behavior

- Runs on YouTube watch pages.
- Finds available caption tracks for the current video.
- Chooses the default caption source by preferred language first (`navigator.languages`, then `nl`, then `en`) and source quality second.
- Falls back to another manual or auto-generated caption source when no preferred-language source is available.
- Tries caption retrieval in this order:
  - YouTube `timedtext` caption URL from the player track;
  - AudioFilms backend/provider API via the shared extension config; default `https://audiofilms-api.dilum.io/api/get-subs`;
  - optional diagnostic YouTube transcript API metadata on the page;
  - optional diagnostic opened transcript panel DOM segments.
- Tracks subtitle source and quality separately from the selected language:
  - direct timedtext captions show as manual/auto with exact timing;
  - backend/provider captions show as manual/auto when the backend proves source kind;
  - transcript fallback is marked with rough timing and a source warning when it cannot prove the selected track;
  - debug output includes each retrieval attempt and whether it failed, succeeded, or was skipped.
- Builds phrase units from timed caption cues.
- Shows available YouTube caption choices in a compact source selector:
  - choices are grouped by YouTube caption language;
  - labels use the names returned by YouTube;
  - only the active or explicitly selected source is loaded;
  - a failed switch keeps the previous working source active and records the error on the tried source.
- Adds a custom learning layer to the YouTube watch page:
  - fixed `#audiofilms-root` attached to `document.documentElement`;
  - an open Shadow DOM root with `#audiofilms-shadow-container`;
  - compact current-phrase bar and controls inside the shadow container;
  - visible `Passive sync` / `Shortcuts active` mode indicator;
  - dictionary/lookup panel appears only after clicking a word and loads results through the configured AudioFilms `/api/dict` backend;
  - YouTube player size and recommendations are not changed by default.
- Keeps normal YouTube playback passive by default. Replay, Previous, and Next enter guided phrase mode; auto-pause only affects guided mode.
- In guided phrase navigation, Previous and Next advance from the visible phrase in the AudioFilms panel, not from the current YouTube playhead.
- Adds a `Mark Issue` control that copies a navigation incident report with recent phrase commands, playback timings, selected source, and current phrase context.
- Adds an `AudioFilms On/Off` page toggle that restores the normal YouTube layout when disabled.
- Treats lookup as backend-capable by default; 2000NL account/progress data depends on the AudioFilms dictionary backend provider configuration.
- Uses YouTube's own transcript panel as a caption extraction fallback and debug fallback, not as the final learning UI.
- Supports:
  - `Space`: toggle normal continuous YouTube play/pause and leave guided phrase playback;
  - `ArrowRight`: next phrase;
  - `ArrowLeft`: previous phrase;
  - `ArrowDown`: replay current phrase;
  - `ArrowUp`: hide phrase text.


## Remote API Configuration

The extension has a single shared resolver in `src/config.js`. Tester builds default to:

```text
AF_API_BASE=https://audiofilms-api.dilum.io
AF_BACKEND_SUBTITLES_URL=$AF_API_BASE/api/get-subs
AF_LOCAL_ASR_URL=$AF_API_BASE/api/asr/jobs
AF_DICTIONARY_URL=$AF_API_BASE/api/dict
AF_2000NL_CONNECT_BASE=https://2000.dilum.io
```

Local development keeps the existing overrides:

```js
localStorage.afShadowingApiBase = "http://localhost:3000";
localStorage.afShadowingBackendSubtitlesUrl = "off"; // disable backend fallback
localStorage.afShadowingLocalAsrUrl = "http://localhost:3000/api/local-asr-practice"; // private compatibility only
localStorage.afShadowingDictionaryUrl = "http://localhost:3000/api/dict";
```

The manifest grants the specific remote host `https://audiofilms-api.dilum.io/*`, not a wildcard `*.dilum.io`, so service movement should happen behind DNS or through `afShadowingApiBase` rather than new extension code.

## Load Locally

1. Open Chrome extensions.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this folder:

```text
extensions/youtube-shadowing
```

Then open:

```text
https://www.youtube.com/watch?v=ZNQWWW-vvfM
```

## Clean Profile Boot Check

Use this before deeper debugging or UI work:

1. Load this folder as an unpacked extension.
2. After code changes, click the reload/refresh button for this unpacked extension on `chrome://extensions`. Reloading only the YouTube tab can leave an older content script active.
   - On this local Chrome profile the current unpacked extension id is `hhdkchoccmikoefhenobdjipgdppdpoc`, so this direct page can be useful:
     `chrome://extensions/?id=hhdkchoccmikoefhenobdjipgdppdpoc`.
3. Open a fresh YouTube watch page and reload it after the extension is loaded.
4. Confirm one of these appears:
   - the `AudioFilms On/Off` toggle;
   - the AudioFilms workspace;
   - a small red `AudioFilms failed to start` badge.
5. In DevTools console, check:

```js
document.documentElement.dataset.afShadowingBoot
document.documentElement.dataset.afShadowingBootVersion
JSON.parse(document.documentElement.dataset.afShadowingBootState || "{}")
window.__afShadowingBoot
window.__afShadowingDebug
```

Expected signal:

- `dataset.afShadowingBoot === "1"` means the content script ran.
- `dataset.afShadowingBootVersion === "phase1-boot-diagnostics-2026-06-10"` means the current diagnostics build ran.
- `dataset.afShadowingBootState` is the page-readable diagnostics snapshot. Prefer this for basic checks because Chrome content script globals live in an isolated world.
- `window.__afShadowingBoot.bootFailed === true` means it ran and crashed during boot.
- `window.__afShadowingBoot` and `window.__afShadowingDebug` are only visible when DevTools is evaluating in the extension/content-script execution context, not the normal page context.
- no dataset and no `window.__afShadowingBoot` means Chrome did not inject the current content script; check the loaded folder, `chrome://extensions` errors, the page URL, whether the extension itself was refreshed, and whether the tab was reloaded after loading the extension.

## Multi-Video Smoke Check

Use this after extension UI/retrieval changes to check the current local Chrome profile against the pinned fixture set:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --reload-extension
```

The smoke check expects:

- Chrome is installed and can be controlled by AppleScript;
- this unpacked extension is loaded with id `hhdkchoccmikoefhenobdjipgdppdpoc`;
- for local-only smoke tests, set `localStorage.afShadowingApiBase = "http://localhost:3000"`; otherwise the tester build defaults to `https://audiofilms-api.dilum.io`.

## Local ASR Dogfood

For local ASR testing in the extension, use the YouTube watch page rather than
the app `/watch` page. Enable the local ASR retrieval path from the YouTube page
console:

```js
localStorage.afShadowingLocalAsr = "on";
localStorage.afShadowingLocalAsrTextSource = "asr";
location.reload();
```

By default this now uses the ASR job endpoint from the shared extension config:

```text
https://audiofilms-api.dilum.io/api/asr/jobs
```

For private local compatibility with the old synchronous endpoint, set `localStorage.afShadowingLocalAsrUrl = "http://localhost:3000/api/local-asr-practice"` and enable `LOCAL_ASR_PRACTICE_ENABLED=true` in the app environment. External tester builds should use `/api/asr/jobs`.

Remote ASR job creation requires a tester token when the backend has `ASR_AUTH_REQUIRED=true`:

```js
localStorage.afShadowingTesterToken = "<tester-token>";
```

Keep `afShadowingLocalAsrDuration` bounded for tester jobs unless the backend explicitly allows full audio. For a quick bounded smoke, set a duration:

```js
localStorage.afShadowingLocalAsrDuration = "300";
```

Useful mode switches:

```js
localStorage.afShadowingLocalAsrTextSource = "asr";    // literal ASR transcript
localStorage.afShadowingLocalAsrTextSource = "manual"; // clean subtitles projected onto ASR timing
localStorage.afShadowingLocalAsrEngine = "stable-ts";
localStorage.afShadowingLocalAsrModel = "large-v3-turbo";
```

Return to normal caption retrieval with:

```js
localStorage.removeItem("afShadowingLocalAsr");
localStorage.removeItem("afShadowingLocalAsrDuration");
location.reload();
```

The default fixture sequence checks:

- manual Dutch captions: `4EE7m94mJpk`;
- legacy manual Dutch fixture: `ZNQWWW-vvfM`;
- app sample with browser-visible auto captions: `iDi5MhglYks`;
- manual captions through backend provider fallback warning: `KrdVIUmBoE4`;
- English manual captions on a multilingual video: `aircAruvnKk`;
- multilingual source switch from English to Arabic on `aircAruvnKk`;
- Dutch auto-caption-only fixture: `xymyDvCgWDA`;
- no-captions empty state: `EColTNIbOko`;
- recovery from no-captions back to manual captions: `4EE7m94mJpk`;
- synthetic YouTube SPA URL-change recovery: `4EE7m94mJpk` -> `ZNQWWW-vvfM` -> `4EE7m94mJpk`;
- backend-off degraded state: `4EE7m94mJpk` with `localStorage.afShadowingBackendSubtitlesUrl = "off"`;
- backend-failed degraded state: `4EE7m94mJpk` with `localStorage.afShadowingBackendSubtitlesUrl` pointed at an unavailable localhost endpoint;
- failed source switch: `4EE7m94mJpk` stays on loaded manual captions when switching to auto-generated captions fails;
- viewport geometry: `4EE7m94mJpk` at wide and narrow Chrome sizes with dictionary open.

It also verifies:

- source badge and phrase count;
- preferred-language default source selection on multilingual videos;
- manual source switching on multilingual/non-Latin caption tracks;
- Unicode word lookup on multilingual/non-Latin caption tracks;
- backend-provider retrieval path for captioned fixtures;
- source menu availability on a video with manual and auto-generated tracks;
- switching from manual to auto-generated captions and back to manual;
- Replay enters `Shortcuts active` and seeks near the current phrase;
- `Space` exits guided phrase playback and toggles continuous YouTube play/pause;
- `Mark Issue` copies a navigation incident report for manual bug reports;
- clicking a word opens the dictionary panel, preserves the current phrase context, and marks the clicked word;
- no-captions hides phrase playback controls;
- no-captions does not show a dictionary panel;
- `AudioFilms Off` removes the panel and `AudioFilms On` restores the expected state;
- URL-change navigation without full document reload resets `videoId`, source badge, phrase count, and visible errors;
- if YouTube timedtext is empty and backend fallback is disabled, the UI shows a clear empty/degraded state instead of stale phrases;
- if YouTube timedtext is empty and backend fallback fails, the UI shows a clear empty/degraded state instead of stale phrases;
- a failed source switch keeps the previously loaded source, phrase count, and current phrase visible while recording the failed option error;
- wide and narrow viewport geometry keeps the phrase panel, dictionary panel, and controls inside the visible browser viewport.

For a single fixture:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only=EColTNIbOko --reload-extension
```

For only the backend-off degraded-state fixture:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-backend-off --reload-extension
```

For only the backend-failed degraded-state fixture:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-backend-failed --reload-extension
```

For only the failed source-switch fixture:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-source-switch-failed --reload-extension
```

For only the multilingual source-switch fixture:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-multilingual-switch --reload-extension
```

For only the viewport geometry fixture:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-geometry --reload-extension
```

## Files

- `manifest.json`: Chrome extension manifest.
- `scripts/smoke-chrome.mjs`: local Chrome multi-video smoke checker for manual, auto-only, no-captions, recovery, SPA, backend-off, backend-failed, failed source-switch, multilingual source-switch, and viewport geometry cases.
- `src/serviceWorker.js`: extension-origin backend/provider fetch bridge for local AudioFilms API calls and 2000NL Connect session management.
- `src/pageBridge.js`: minimal main-world bridge for YouTube UI clicks that do not respond reliably from the isolated content-script world.
- `src/bootDiagnostics.js`: boot sentinel, page-readable diagnostics, and visible boot failure badge.
- `src/phrases.js`: cue-to-phrase builder used by the content script.
- `src/captionTracks.js`: YouTube caption track extraction, source labels, source grouping, and source debug formatting.
- `src/youtubeAdapter.js`: watch-page URL helpers, player metadata extraction, balanced JSON extraction, and video element lookup.
- `src/transcriptRetrieval.js`: timedtext, transcript API, transcript panel fallback/state diagnostics, cue parsers, and transcript quality metadata.
- `src/content.js`: YouTube page integration, retrieval orchestration, playback controls, and temporary UI rendering.
- `src/content.css`: minimal injected global helper styles for the toggle and transcript debug/highlight state.
- `src/shadow.css`: shadow-loaded panel styles for the AudioFilms learning layer.

## Current Limits

- No build step.
- 2000NL Connect exists in the extension service worker for local dogfood. It stores and refreshes a Connect session through Chrome extension storage, then forwards the current access token to AudioFilms `/api/dict*` calls.
- Dictionary lookup goes through `https://audiofilms-api.dilum.io/api/dict` by default. Set `localStorage.afShadowingApiBase`, `localStorage.afShadowingDictionaryUrl`, or `off` for diagnostics.
- 2000NL-backed dictionary results require either the extension Connect session token or a valid short-lived `DICTIONARY_2000NL_ACCESS_TOKEN` fallback in the AudioFilms app environment.
- Plain lookup is read-only. Explicit card actions go through `/api/dict/actions`, then refresh lookup state. Per-card translation goes through `/api/dict/translation`.
- Stable unpacked dev extension ID: `hhdkchoccmikoefhenobdjipgdppdpoc`.
- 2000NL Connect dev redirect URI: `https://hhdkchoccmikoefhenobdjipgdppdpoc.chromiumapp.org/`.
- 2000NL Connect dev origin: `chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc`.
- No word-level alignment.
- Uses YouTube web-player metadata, which can change.
- Backend/provider fallback expects `https://audiofilms-api.dilum.io/api/get-subs` by default. Set `localStorage.afShadowingApiBase = "http://localhost:3000"` for local development, or set `localStorage.afShadowingBackendSubtitlesUrl` to a specific endpoint or `off`.
- YouTube transcript API / DOM probing is disabled by default. Set `localStorage.afShadowingTranscriptFallback = "on"` only for diagnostics.
