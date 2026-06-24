# Architecture

## Mode Selection

This repo is using `light` Harness structure.

Reason:

- the project is still fairly small,
- but it has repeated agent-change risk,
- external providers and local caches introduce non-trivial behavior,
- and documentation drift is already visible.

`full` would be too heavy for the current size. `tiny` would be too weak for repeated work across app code, provider integrations, and environment-specific behavior.

## System Shape

AudioFilms is a Next.js application for phrase-based listening practice on YouTube videos.

The repo also contains a separate Chrome extension spike under `extensions/youtube-shadowing/`. That spike validates direct YouTube-page caption access and phrase navigation without depending on the Next.js app runtime.

Primary flow:

1. User lands on the app and submits a YouTube URL.
2. The watch route loads video-specific data.
3. `/api/video-info` returns available subtitle language metadata.
4. `/api/get-subs` fetches and caches subtitle phrases through the configured subtitle retrieval path.
5. The client playback UI uses Zustand state to loop phrases and switch between practice/display modes.
6. `/api/dict` resolves clicked-word definitions through the configured dictionary provider.
7. `/api/dict/actions` and `/api/dict/translation` proxy explicit 2000NL card actions and per-card translation requests when the selected dictionary provider returns platform-backed cards.

## Main Boundaries

### UI

- `app/src/app/`
- `app/src/components/`
- `app/src/hooks/`

These files own user interaction, route-level loading/error states, the YouTube embed surface, and client-side orchestration for playback controls and dictionary lookups.

### Client State

- `app/src/store/playerStore.ts`

This is the source of truth for playback mode, current phrase index, video id, and loaded subtitle language. It should not perform network I/O or vendor-specific response shaping.

### Chrome Extension Spike

- `extensions/youtube-shadowing/manifest.json`
- `extensions/youtube-shadowing/src/content.js`
- `extensions/youtube-shadowing/src/content.css`

This is an isolated MVP experiment. It may duplicate small pieces of subtitle parsing or phrase-building logic while validating feasibility. Shared contracts or modules should only be extracted after the extension behavior proves useful.

### Subtitle Retrieval

- `app/src/app/api/get-subs/route.ts`
- `app/src/lib/subtitleService.ts`
- `app/src/lib/providers/`
- `app/src/lib/subtitleCache.ts`
- `app/src/types/subtitles.ts`

The API route is the HTTP boundary only. `subtitleService.ts` owns cache lookup/write, subtitle extractor/provider execution, and the sample-video fallback path. Retrieval selection is environment-driven and provider/extractor-specific response handling must stay below the route boundary.

### Video Metadata

- `app/src/app/api/video-info/route.ts`
- `app/src/lib/videoInfoService.ts`
- `app/src/lib/youtubeMetadata.ts`
- `app/src/lib/videoInfoCache.ts`

This path exists to support language selection and avoid redundant provider work. The route should return normalized metadata; cache and yt-dlp orchestration belong in the service/helper layer.

### Dictionary Lookup

- `app/src/app/api/dict/route.ts`
- `app/src/app/api/dict/actions/route.ts`
- `app/src/app/api/dict/translation/route.ts`
- `app/src/lib/dictionaryLookup.ts`
- `app/src/lib/twoThousandNlPlatform.ts`
- `app/src/lib/providers/dictionary/`
- `app/src/types/dictionary.ts`

Dictionary lookups are server-mediated. The UI should not call third-party providers directly or understand provider-specific payloads. The route returns normalized dictionary payloads; provider execution and error-to-response mapping live in the server service layer.

For 2000NL-backed lookup, AudioFilms treats 2000NL as the dictionary, progress, action, and translation authority. AudioFilms owns a shallow overlay projection (`cards[]`) for app and extension rendering. Plain lookup is read-only; mutations go through explicit card actions and are followed by refreshed lookup state instead of local progress simulation.

### Local File Caches

- `app/src/lib/subtitleCache.ts`
- `app/src/lib/videoInfoCache.ts`
- `app/.subtitle-cache/`
- `app/.video-info-cache/`

These caches are local performance helpers only. They may be deleted without changing source behavior.

## External Dependencies

Runtime dependencies currently include:

- Next.js / React
- YouTube embed via `react-youtube`
- subtitle provider/extractor paths: Supadata and `yt-dlp`
- dictionary providers: 2000NL, OpenRouter, OpenAI, or Free Dictionary

Environment selection currently happens through `app/env.example` keys:

- `SUBTITLE_PROVIDER`
- `SUPADATA_API_KEY`
- `YT_DLP_PATH`
- `DICTIONARY_PROVIDER`
- `OPENROUTER_API_KEY`
- `OPENROUTER_DICTIONARY_MODEL`
- `OPENROUTER_DICTIONARY_PROMPT`
- `OPENAI_API_KEY`
- `OPENAI_API_URL`
- `OPENAI_MODEL`
- `OPENAI_DICTIONARY_PROMPT`
- `DICTIONARY_2000NL_API_BASE`
- `DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN`
- `DICTIONARY_2000NL_ACCESS_TOKEN`
- `DICTIONARY_2000NL_TIMEOUT_MS`

## Safe Change Patterns

- Substantial code changes must start from the module ownership baseline below.
  Routes stay thin, services own orchestration, providers own vendor-specific
  behavior, types own stable app-facing contracts, and UI/components should not
  parse provider-specific payloads or simulate 2000NL learning state.
- Prefer domain extraction over broad-file growth. If a working module such as
  an API route, service, provider, or `extensions/youtube-shadowing/src/content.js`
  needs decomposition, first protect current behavior with tests or smoke
  evidence, then split by stable responsibilities rather than rewriting the
  workflow wholesale.
- UI-only changes should avoid changing provider contracts.
- Client hooks may orchestrate browser events and fetch normalized API payloads, but they should not embed provider-specific logic.
- Provider changes should preserve the contracts in `app/src/types/`.
- Cache changes should preserve graceful failure. Cache read/write failures must not break normal requests.
- If changing environment variables or defaults, update `app/env.example` and this doc set in the same change.

## ADR-0001: Backend-Owned Practice Phrase Building

### Status

Accepted. First backend response-boundary slice is implemented.

### Context

The app and no-build YouTube extension both need learner-facing phrase units for replay, hide/reveal, and phrase navigation. Provider subtitle units are not always good practice units: they can be too long, too short, rolling-caption-shaped, or poorly aligned with sentence boundaries.

### Decision

AudioFilms builds learner-facing `practicePhrases[]` in the backend/app pipeline while retaining provider/source subtitle units separately as provider phrases. The extension should consume backend-produced practice phrases and metadata when available. Extension-only segmentation is allowed only as a temporary fallback for direct page `timedtext` captions that have not yet passed through the backend.

Current implementation note: `app/src/lib/practice/phrases.ts` contains the app normalizer, `subtitleService.ts` projects provider/source `phrases[]` into backend-owned `practicePhrases[]`, and `/api/get-subs` returns both shapes. `WatchClient` prefers `data.practicePhrases` and only normalizes on the client as a compatibility fallback for old or partial responses. The remaining ADR-0001 work is richer source/timing/artifact metadata, not moving basic practice phrase projection into `/api/get-subs`.

### Consequences

- API contracts should separate provider/source phrases from practice phrases instead of overloading `phrases[]`.
- Display text and timing evidence can come from different sources, but the backend is responsible for exposing that relationship clearly.
- Debug and issue reports should show when phrase boundaries are exact, inferred, projected from ASR timing, or otherwise degraded.

## ADR-0002: 2000NL Dictionary Platform Boundary

### Status

Accepted. First dogfood implementation is present.

### Context

Dutch lookup should use 2000NL as the dictionary and learning authority instead of duplicating its dictionary domain model, progress semantics, action IDs, card type IDs, or translation cache rules inside AudioFilms.

### Decision

AudioFilms treats 2000NL as the dictionary, progress, action, and translation authority for Dutch word lookup. AudioFilms backend owns the shallow overlay projection from 2000NL lookup results into display-oriented dictionary cards. The extension renders that backend-provided shape and does not parse 2000NL `entry.raw` directly.

The first overlay card model follows these rules:

- one AudioFilms overlay card maps to one top-level 2000NL `lookup.items[]` result;
- nested `entry.raw.meanings[]` are content inside that card, not separate action targets;
- overlay actions always target `cardTypeId=word-to-definition`;
- plain lookup is read-only and must not automatically call `record-view`;
- all learning/progress changes happen only after an explicit user action on one card;
- after a successful action, AudioFilms refreshes lookup instead of simulating updated progress locally;
- translation is requested per card through 2000NL `POST /api/platform/v1/translation` using `entryId` and `targetLang`.

### Current Implementation

- `app/src/lib/providers/dictionary/TwoThousandNlDictionaryProvider.ts` calls 2000NL lookup and projects rich `cards[]`.
- `app/src/app/api/dict/route.ts` accepts an optional incoming Bearer token and passes it to the provider layer.
- `app/src/app/api/dict/actions/route.ts` proxies explicit platform actions.
- `app/src/app/api/dict/translation/route.ts` proxies per-card translation requests.
- `app/src/app/api/dict/lookup/route.ts` uses forwarded user Bearer tokens for
  user-state lookup and the dedicated catalog token for read-only guest lookup.
- The extension has a 2000NL Connect flow in its service worker and forwards the current access token to AudioFilms `/api/dict*` calls when available.
- `DICTIONARY_2000NL_ACCESS_TOKEN` remains a local dogfood fallback, not the final product auth model.

### Consequences

- AudioFilms `/api/dict` supports both the legacy flat `definition` shape and an `overlay-v1` card shape for rich consumers.
- AudioFilms backend may derive labels, collapsed content, examples, and ordering for its overlay, but it must not invent dictionary meanings, action IDs, review result IDs, progress states, or card types.
- Button localization is separate from this boundary.

## Module Ownership Baseline

The repo still follows a thin-route, service-backed architecture with normalized app-level contracts. Ownership is:

- `app/src/components/` and `app/src/app/`: rendering and route-level user experience
- `app/src/hooks/`: client-side orchestration such as keyboard controls and dictionary fetch lifecycle
- `app/src/store/`: playback/session state only
- `app/src/app/api/*`: HTTP boundary, input validation, and JSON response wiring
- `app/src/lib/*Service.ts` and `app/src/lib/dictionaryLookup.ts`: server-side orchestration, cache usage, provider calls, primary/fallback policy, and normalized response shaping including user-facing degraded-state metadata
- `app/src/lib/providers/**`: vendor-specific integrations only
- `app/src/types/**`: stable app-facing contracts shared across layers

### Consequences

- UI no longer needs to understand provider-specific dictionary or subtitle response shapes.
- Route handlers stay small and are easier to review.
- Provider swaps or fallback-policy changes stay below the UI and route boundaries, while UI receives explicit success/error metadata for degraded but recoverable states.
- Further UI decomposition is optional and should be driven by presentation concerns, not by leaking orchestration.

## Validation

Run from `app/`:

```bash
npm run lint
npm run build
```
