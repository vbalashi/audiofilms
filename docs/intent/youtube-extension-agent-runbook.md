# YouTube Extension Agent Runbook

Status: active handoff/runbook, June 11, 2026.

Use this when a new agent needs to continue work on `extensions/youtube-shadowing/` without prior thread context.

## What To Open First

Read these files in order:

1. `AGENTS.md` for repository rules.
2. `extensions/youtube-shadowing/README.md` for extension behavior and smoke command flags.
3. `docs/intent/youtube-extension-validation-matrix.md` for current fixtures and latest pass/fail evidence.
4. `docs/exec-plans/active/youtube-extension-stabilization-and-rebuild.md` for architecture direction and completed phases.

Keep extension spike changes inside `extensions/youtube-shadowing/` unless the work explicitly changes provider contracts or shared practice/subtitle behavior.

## Local Chrome Profile

The currently used local unpacked Chrome extension is:

- extension path: `/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing`
- extension id in the current normal Chrome profile: `lahhflkjhgnicgogaocdipfelambklmo`
- extension details page: `chrome://extensions/?id=lahhflkjhgnicgogaocdipfelambklmo`

Reload the unpacked extension itself after content script changes. Reloading only the YouTube tab can leave an older content script active.

Expected manual reload flow:

1. Open `chrome://extensions/?id=lahhflkjhgnicgogaocdipfelambklmo`.
2. Click the extension reload button.
3. Reload the active YouTube watch tab.
4. Confirm the AudioFilms toggle or panel appears.

The smoke script can do this reload automatically with `--reload-extension`.

## Backend Requirement

Most smoke fixtures expect the local AudioFilms app API at:

```text
http://localhost:3000/api/get-subs
```

Before full smoke, make sure the app server is running. The smoke script performs a preflight request to:

```text
http://localhost:3000/api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual
```

If the backend is intentionally unavailable for browser-only diagnostics, pass `--skip-backend-check`. Do not use that for normal regression validation.

Current subtitle backend expectation:

- The app/provider default is `yt-dlp`, with Supadata as an explicit fallback path.
- The extension still tries YouTube page `timedtext` first. If YouTube returns `HTTP 429`, it falls back to `http://localhost:3000/api/get-subs`.
- Backend auto captions should show `via yt-dlp` when local `yt-dlp` is available.
- If the UI still shows `via Supadata`, check for:
  - an old Next dev server that was not restarted after provider changes;
  - `.env.local` explicitly setting `SUBTITLE_PROVIDER=supadata`;
  - stale subtitle cache from an older cache version;
  - unavailable local `yt-dlp`, forcing provider fallback;
  - YouTube subtitle downloads returning `HTTP 429`, forcing provider fallback.
- Runtime `yt-dlp` auto captions include the Stage 1 rolling-caption cleanup used by the shootout lab.
- Supadata fallback cache is intentional. Do not clear it just because it is Supadata; clear it only when testing provider selection from scratch.
- During testing, the source badge should distinguish live/cached and primary/fallback paths, for example `via Supadata · cached · fallback`.
- Subtitle cache is indefinite by default. Use the extension `Refresh Cache` debug button, or `/api/get-subs?...&refresh=1`, only when an intentional re-fetch is needed.

## Boot Diagnostics

On a YouTube watch page, these page-readable diagnostics should be available from the normal page console:

```js
document.documentElement.dataset.afShadowingBoot
document.documentElement.dataset.afShadowingBootVersion
JSON.parse(document.documentElement.dataset.afShadowingBootState || "{}")
document.documentElement.dataset.afShadowingLastError
```

Expected signals:

- `dataset.afShadowingBoot === "1"` means the content script ran.
- `dataset.afShadowingBootVersion === "phase1-boot-diagnostics-2026-06-10"` means the current diagnostics build ran.
- `dataset.afShadowingBootState` includes `watchPageDetected`, `videoIdDetected`, `videoElementDetected`, `captionTracksCount`, `selectedRetrievalPath`, and `lastError`.
- No dataset usually means the current content script was not injected; reload the unpacked extension itself and reload the YouTube tab.

`window.__afShadowingBoot` and `window.__afShadowingDebug` exist only in the extension/content-script execution world, not reliably in the normal page console. Prefer the `documentElement.dataset` diagnostics for smoke/debug checks.

## Smoke Commands

Run from the repository root:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --reload-extension
```

The default smoke uses AppleScript to control the normal Google Chrome profile and currently covers:

- Dutch manual captions;
- legacy manual captions;
- browser-visible auto captions;
- provider fallback warning;
- English manual captions on a multilingual video;
- multilingual source switching to Arabic and Arabic word lookup;
- auto-only captions;
- no-captions empty state;
- recovery after no-captions;
- synthetic YouTube SPA navigation;
- backend disabled degraded state;
- backend failed degraded state;
- failed source switch preserving the previous working source;
- wide/narrow viewport geometry.

Useful focused runs:

```bash
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only=EColTNIbOko --reload-extension
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only=aircAruvnKk --reload-extension
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-backend-off --reload-extension
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-backend-failed --reload-extension
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-source-switch-failed --reload-extension
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-multilingual-switch --reload-extension
node extensions/youtube-shadowing/scripts/smoke-chrome.mjs --only-geometry --reload-extension
```

If a focused run changes behavior, update `docs/intent/youtube-extension-validation-matrix.md` with the exact fixture, observed source badge, count, error state, and whether it is a regression or an intentional new baseline.

## Syntax And App Validation

For extension-only changes:

```bash
find /Users/khrustal/dev/audiofilms/extensions/youtube-shadowing/src /Users/khrustal/dev/audiofilms/extensions/youtube-shadowing/scripts -name '*.js' -o -name '*.mjs' | xargs -n1 node --check
```

For app/provider/shared subtitle changes, also run from `app/`:

```bash
npm run lint
npm run build
```

If provider setup or environment handling changed, verify:

```bash
test -f app/env.example
```

## Where To Inspect Logs

Use the extension UI `Debug` button first. It includes:

- boot state;
- selected source;
- fetch origin and provider, for example `via YouTube page`, `via Supadata`, or `via yt-dlp`;
- transcript result metadata;
- phrase count;
- current phrase;
- recent guided phrase navigation events;
- visible error;
- per-source errors and retrieval attempts;
- recent extension events.

Use `Mark Issue` while manually testing phrase navigation. Press it immediately after a wrong Replay/Previous/Next/Space behavior. It copies a navigation incident report to the clipboard with:

- current video and URL;
- selected practice source;
- fetch origin/provider and retrieval path, so page-loaded captions can be distinguished from backend provider captions;
- guided/auto-pause state;
- current YouTube playback time;
- visible phrase index and text;
- recent navigation commands and delayed playback observations;
- recent debug events.

Paste that report into the next agent message instead of describing the miss only in prose.

For service worker or manifest/runtime errors:

1. Open `chrome://extensions/?id=lahhflkjhgnicgogaocdipfelambklmo`.
2. Inspect extension errors on the detail page.
3. Open the service worker inspector if Chrome exposes the service worker link.

For page injection failures, check:

- `chrome://extensions` error panel;
- YouTube page console;
- `document.documentElement.dataset.afShadowingBootState`;
- whether the unpacked extension was reloaded after code changes.

## Expert Review Zip

Do not rebuild the expert-review zip after every iteration. It is an on-demand handoff artifact for sending the current source/docs/screenshots to an external reviewer.

Rebuild it only when:

- the user explicitly asks for an expert-review package;
- screenshots or review docs changed and need to be bundled;
- an external handoff requires a single archive.

When needed, build and test it from the repo root:

```bash
zip_path='docs/design-handoff/youtube-extension-expert-review/audiofilms-youtube-extension-expert-review.zip'
rm -f "$zip_path"
zip -r -q "$zip_path" \
  docs/design-handoff/youtube-extension-expert-review/README.md \
  docs/design-handoff/youtube-extension-expert-review/REVIEW_BRIEF_RU.md \
  docs/design-handoff/youtube-extension-expert-review/RELATED_EXTENSION_RESEARCH_RU.md \
  docs/design-handoff/youtube-extension-expert-review/screenshots \
  docs/exec-plans/active/youtube-extension-stabilization-and-rebuild.md \
  docs/exec-plans/active/youtube-shadowing-extension-mvp.md \
  docs/intent/index.md \
  docs/intent/subtitle-retrieval-strategy.md \
  docs/intent/subtitle-practice-contract.md \
  docs/intent/youtube-extension-validation-matrix.md \
  extensions/youtube-shadowing \
  app/src/types/subtitles.ts \
  app/src/types/dictionary.ts \
  app/src/lib/subtitleService.ts \
  app/src/lib/practice \
  app/src/lib/providers \
  app/src/app/api/get-subs/route.ts \
  app/src/app/api/dict/route.ts \
  'app/src/app/watch/[videoId]/WatchClient.tsx' \
  app/src/components/PlayerLayout.tsx \
  app/src/components/YouTubePlayer.tsx \
  app/src/hooks/useDictionaryLookup.ts \
  -x '*/.DS_Store' '*.DS_Store'
unzip -t "$zip_path"
```

Do not treat the zip as a substitute for commits. Commit source/docs changes at coherent checkpoints; rebuild the zip only when the archive itself is needed.

## Commit Discipline

Prefer focused commits after a validated checkpoint. A good extension stabilization commit should include:

- source changes;
- smoke script changes if validation coverage changed;
- matching README/runbook/matrix updates;
- the exact validation evidence in the commit message body when useful.

Avoid committing:

- `.DS_Store`;
- generated caches such as `.subtitle-cache/` or `.video-info-cache/`;
- a freshly rebuilt expert-review zip unless the archive itself is the requested deliverable.
