# YouTube Extension Agent Runbook

Status: active handoff/runbook, June 11, 2026.

Use this when a new agent needs to continue work on `extensions/youtube-shadowing/` without prior thread context.

## What To Open First

Read these files in order:

1. `AGENTS.md` for repository rules.
2. `extensions/youtube-shadowing/README.md` for extension behavior and smoke command flags.
3. `docs/intent/youtube-extension-designer-brief.md` for current product/UI intent and terminology.
4. `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md` when backend/API fields are involved.
5. `docs/intent/youtube-extension-validation-matrix.md` for current fixtures and latest pass/fail evidence.
6. Optional historical context only:
   `docs/exec-plans/active/youtube-extension-stabilization-and-rebuild.md`.
   Do not implement old UI labels, shortcut maps, source badges, or ASR
   non-goals from that file when they conflict with the designer brief or
   backend/UI contract.

Keep extension spike changes inside `extensions/youtube-shadowing/` unless the work explicitly changes provider contracts or shared practice/subtitle behavior.

## Local Chrome Profile

The currently used local unpacked Chrome extension in the user's normal Google
Chrome profile is:

- extension path: `/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing`
- extension id in the current normal Chrome profile: `hhdkchoccmikoefhenobdjipgdppdpoc`
- extension details page: `chrome://extensions/?id=hhdkchoccmikoefhenobdjipgdppdpoc`

Reload the unpacked extension itself after content script changes. Reloading only the YouTube tab can leave an older content script active.

Expected manual reload flow:

1. Open `chrome://extensions/?id=hhdkchoccmikoefhenobdjipgdppdpoc`.
2. Click the extension reload button.
3. Reload the active YouTube watch tab.
4. Confirm the AudioFilms toggle or panel appears.

The smoke script can do this reload automatically with `--reload-extension`.

## Real Google Chrome Profile Protocol

Use the user's visible `/Applications/Google Chrome.app` profile for extension
dogfooding unless the user explicitly approves an isolated browser. The goal is
that the user and the agent inspect the same installed extension, the same
Chrome session, the same logged-in websites, and the same extension storage.

Do not use Chrome for Testing, Playwright's default browser profile, or
agent-browser managed profiles for this workflow. Those profiles are useful for
isolated web QA, but they install a different extension instance and can hide
profile-specific issues.

The current stable unpacked dev extension identity is fixed by the manifest
`key`:

```text
extension id: hhdkchoccmikoefhenobdjipgdppdpoc
extension origin: chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc
connect redirect URI: https://hhdkchoccmikoefhenobdjipgdppdpoc.chromiumapp.org/
```

If Chrome still shows the old unpacked id
`lahhflkjhgnicgogaocdipfelambklmo`, remove that old unpacked extension and load
`/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing` again. The old id
was produced before the stable manifest key was added and will not match the
2000NL Connect client registration.

To load the unpacked extension into the user's real profile:

1. Open `/Applications/Google Chrome.app`, not Chrome for Testing.
2. Open `chrome://extensions`.
3. Keep Developer mode enabled.
4. Click `Load unpacked`.
5. Select `/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing`.
6. Verify the card shows `AudioFilms YouTube Shadowing` and ID
   `hhdkchoccmikoefhenobdjipgdppdpoc`.
7. Click the extension reload button on that card.

When automating the macOS file picker, do not type the path with keystrokes
while the user's keyboard layout might be non-English. A bad layout can turn
`/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing` into unreadable
text such as `/фффl/...`, and Chrome will silently fail to load the extension.
Use the clipboard or set the accessibility text field value directly.

Useful verification commands:

```bash
osascript -e 'tell application "Google Chrome" to open location "chrome://extensions"'
```

```bash
osascript <<'OSA'
tell application "Google Chrome"
  tell active tab of front window
    execute javascript "JSON.stringify((() => { const list=document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-item-list').shadowRoot; return Array.from(list.querySelectorAll('extensions-item')).map(item => ({id:item.getAttribute('id') || item.data?.id, text:item.shadowRoot?.innerText || ''})).filter(x => x.id === 'hhdkchoccmikoefhenobdjipgdppdpoc'); })())"
  end tell
end tell
OSA
```

```bash
curl -sS -H 'Origin: chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc' \
  'https://2000.dilum.io/api/connect/clients/audiofilms_chrome_dev?redirect_uri=https%3A%2F%2Fhhdkchoccmikoefhenobdjipgdppdpoc.chromiumapp.org%2F&scope=platform%3Aread%20platform%3Awrite%20offline_access'
```

Chrome may not immediately flush newly loaded unpacked extension settings to
`~/Library/Application Support/Google/Chrome/*/Preferences`. Treat the visible
`chrome://extensions` card as the primary confirmation during the live session;
the Preferences file is only a secondary check after Chrome has had time to
write profile state.

Remote debugging caveat: launching the user's normal Chrome with
`--remote-debugging-port=9222` can leave the process running with that flag while
no port listens. Do not interpret that as permission to switch to Chrome for
Testing. Continue through the visible Chrome UI, AppleScript, accessibility, or
the existing smoke helper that targets normal Google Chrome.

Before using any helper that opens a browser, confirm whether it targets the
normal Chrome profile. `extensions/youtube-shadowing/scripts/smoke-chrome.mjs`
is the preferred helper for this extension because it uses AppleScript against
normal Google Chrome and supports `--reload-extension`.

## Backend Requirement

Local smoke fixtures expect the local AudioFilms app API at:

```text
http://localhost:3000/api/get-subs
```

Before full smoke, make sure the app server is running. The smoke script performs a preflight request to:

```text
http://localhost:3000/api/get-subs?videoId=4EE7m94mJpk&lang=nl&sourceKind=manual
```

If the backend is intentionally unavailable for browser-only diagnostics, pass `--skip-backend-check`. Do not use that for normal regression validation.

Tester builds may default to the remote API configured in
`extensions/youtube-shadowing/README.md`. Treat this section as local regression
smoke guidance, not as the remote tester deployment default.

Dictionary lookup defaults to the local AudioFilms app API command path:

```text
http://localhost:3000/api/dict/lookup
```

The extension sends dictionary requests through its service worker. To use 2000NL-backed Dutch lookup, run the AudioFilms app with:

```text
DICTIONARY_PROVIDER=2000nl
DICTIONARY_2000NL_API_BASE=https://2000.dilum.io/api/platform/v1
DICTIONARY_2000NL_ACCESS_TOKEN=<short-lived-local-dogfood-token>
DICTIONARY_2000NL_LOCAL_DOGFOOD_GUEST_LOOKUP=true
```

`DICTIONARY_2000NL_ACCESS_TOKEN` is only a short-lived local dogfood fallback
and must not be configured as production guest identity. The durable path is
2000NL Connect with AudioFilms forwarding the current user Bearer token:

- AudioFilms extension manifest has a stable unpacked dev ID:
  `hhdkchoccmikoefhenobdjipgdppdpoc`.
- Connect redirect URI:
  `https://hhdkchoccmikoefhenobdjipgdppdpoc.chromiumapp.org/`.
- Extension origin:
  `chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc`.
- 2000NL connected client id:
  `audiofilms_chrome_dev`.

Register the 2000NL client with:

```sql
insert into connected_clients (
  client_id,
  display_name,
  client_type,
  allowed_redirect_uris,
  allowed_origins,
  allowed_scopes,
  requires_pkce
) values (
  'audiofilms_chrome_dev',
  'AudioFilms Dev',
  'chrome_extension',
  array['https://hhdkchoccmikoefhenobdjipgdppdpoc.chromiumapp.org/'],
  array['chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc'],
  array['platform:read', 'platform:write', 'offline_access'],
  true
) on conflict (client_id) do update set
  allowed_redirect_uris = excluded.allowed_redirect_uris,
  allowed_origins = excluded.allowed_origins,
  allowed_scopes = excluded.allowed_scopes,
  requires_pkce = excluded.requires_pkce,
  status = 'active',
  updated_at = now();
```

Set 2000NL CORS to include the extension origin:

```text
CONNECT_API_ALLOWED_ORIGINS=chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc
PLATFORM_API_ALLOWED_ORIGINS=chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc
```

The extension should still call AudioFilms `/api/dict*`; AudioFilms forwards the
current 2000NL Bearer token to `https://2000.dilum.io/api/platform/v1/*`.

Current subtitle backend expectation:

- The app default subtitle extractor is `yt-dlp`, with Supadata as an explicit subtitle provider fallback when configured.
- The extension still tries YouTube page timed text first. If YouTube returns `HTTP 429`, it falls back to `http://localhost:3000/api/get-subs`.
- For private local ASR dogfood, set `localStorage.afShadowingLocalAsr = "on"` on the
  YouTube watch page. This deliberately tries
  `http://localhost:3000/api/local-asr-practice` before YouTube `timedtext`,
  so the extension is testing the local transcript/alignment path rather than
  the ordinary caption path.
- Private local ASR dogfood can use the full video by default. Do not set
  `localStorage.afShadowingLocalAsrDuration` unless you explicitly want a
  bounded smoke. Remote tester jobs should stay duration-bounded unless the
  backend explicitly allows full audio jobs. Use
  `localStorage.afShadowingLocalAsrTextSource = "asr"` for literal ASR segments
  and `"manual"` for clean subtitles projected onto ASR word timings.
- Current debug/source badges may still show implementation details such as
  `via yt-dlp`, `Manual`, `Auto`, or `exact`. That is current operational
  evidence, not the redesign target. The redesign target is documented in
  `docs/intent/youtube-extension-designer-brief.md`: default learner-facing
  labels should be `Dutch captions`, `Dutch auto-captions`, `ASR transcript`,
  and readiness chips such as `Ready` or `Precise`.
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

For the redesigned UI, Debug, Copy Debug, Refresh Cache, and Mark Issue should
move behind a quiet overflow/debug surface. Until that redesign lands, use the
current visible controls for validation.

Use `Mark Issue` while manually testing phrase navigation. Press it immediately after a wrong Replay/Previous/Next/Space behavior. It copies a navigation incident report to the clipboard with:

- current video and URL;
- selected practice source;
- fetch origin/provider and retrieval path, so page-loaded captions can be distinguished from backend-orchestrated captions;
- guided/auto-pause state;
- current YouTube playback time;
- visible phrase index and text;
- recent navigation commands and delayed playback observations;
- recent debug events.

Paste that report into the next agent message instead of describing the miss only in prose.

For service worker or manifest/runtime errors:

1. Open `chrome://extensions/?id=hhdkchoccmikoefhenobdjipgdppdpoc`.
2. Inspect extension errors on the detail page.
3. Open the service worker inspector if Chrome exposes the service worker link.

For page injection failures, check:

- `chrome://extensions` error panel;
- YouTube page console;
- `document.documentElement.dataset.afShadowingBootState`;
- whether the unpacked extension was reloaded after code changes.

## Expert Review Zip

Do not rebuild the expert-review zip after every iteration. It is an on-demand handoff artifact for sending the current source/docs/screenshots to an external reviewer.

This zip is not the senior architect package for the AudioFilms + 2000NL
boundary review. Use the separate two-repo architect package list below when the
handoff is about cross-project API/auth/dictionary contracts.

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
  docs/intent/index.md \
  docs/intent/youtube-extension-designer-brief.md \
  docs/exec-plans/active/youtube-extension-backend-ui-contracts.md \
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

## Architect Two-Repo Package

For a senior architect reviewing AudioFilms and 2000NL together, do not rely on
the expert-review zip. Provide the two repositories plus this focused file list:

AudioFilms:

- `docs/intent/youtube-extension-designer-brief.md`
- `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`
- `CONTEXT.md`
- `ARCHITECTURE.md`
- `docs/intent/subtitle-practice-contract.md`
- `docs/intent/youtube-extension-agent-runbook.md`
- `extensions/youtube-shadowing/README.md`
- `docs/exec-plans/active/2000nl-platform-dictionary-integration.md`
- `docs/adr/0002-2000nl-dictionary-platform-boundary.md`
- `app/src/types/dictionary.ts`
- `app/src/lib/twoThousandNlPlatform.ts`
- `app/src/lib/providers/dictionary/index.ts`
- `app/src/lib/providers/dictionary/TwoThousandNlDictionaryProvider.ts`
- `app/src/app/api/dict/route.ts`
- `app/src/app/api/dict/actions/route.ts`
- `app/src/app/api/dict/translation/route.ts`
- `app/src/app/api/get-subs/route.ts`
- `app/src/app/api/asr/jobs/route.ts`
- `app/src/app/api/asr/jobs/[jobId]/route.ts`
- `extensions/youtube-shadowing/src/serviceWorker.js`
- `extensions/youtube-shadowing/src/content.js`

2000NL:

- `docs/reference/platform-api.md`
- `docs/reference/connect-api.md`
- `packages/shared/types/platform.ts`
- `apps/ui/lib/platform/platformApi.ts`
- `apps/ui/app/api/platform/v1/*`
- `apps/ui/tests/api/platformV1Routes.test.ts`
- `apps/ui/tests/api/platformActionsRoute.test.ts`
- `apps/ui/tests/api/platformTranslationRoute.test.ts`
- `db/migrations/004_user_features.sql`
- `db/migrations/064_multilanguage_scope_rpcs.sql`

Do not include older active plans as baseline material unless they are explicitly
marked and used as historical/operational references.

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
