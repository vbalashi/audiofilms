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

Primary flow:

1. User lands on the app and submits a YouTube URL.
2. The watch route loads video-specific data.
3. `/api/video-info` returns available subtitle language metadata.
4. `/api/get-subs` fetches and caches subtitle phrases through the configured subtitle provider.
5. The client playback UI uses Zustand state to loop phrases and switch between blind/read modes.
6. `/api/dict` resolves clicked-word definitions through the configured dictionary provider.

## Main Boundaries

### UI

- `app/src/app/`
- `app/src/components/`
- `app/src/hooks/`

These files own user interaction, route-level loading/error states, the YouTube embed surface, and client-side orchestration for playback controls and dictionary lookups.

### Client State

- `app/src/store/playerStore.ts`

This is the source of truth for playback mode, current phrase index, video id, and loaded subtitle language. It should not perform network I/O or vendor-specific response shaping.

### Subtitle Retrieval

- `app/src/app/api/get-subs/route.ts`
- `app/src/lib/subtitleService.ts`
- `app/src/lib/providers/`
- `app/src/lib/subtitleCache.ts`
- `app/src/types/subtitles.ts`

The API route is the HTTP boundary only. `subtitleService.ts` owns cache lookup/write, provider execution, and the sample-video fallback path. Provider selection is environment-driven and provider-specific response handling must stay below the route boundary.

### Video Metadata

- `app/src/app/api/video-info/route.ts`
- `app/src/lib/videoInfoService.ts`
- `app/src/lib/youtubeMetadata.ts`
- `app/src/lib/videoInfoCache.ts`

This path exists to support language selection and avoid redundant provider work. The route should return normalized metadata; cache and yt-dlp orchestration belong in the service/helper layer.

### Dictionary Lookup

- `app/src/app/api/dict/route.ts`
- `app/src/lib/dictionaryLookup.ts`
- `app/src/lib/providers/dictionary/`
- `app/src/types/dictionary.ts`

Dictionary lookups are server-mediated. The UI should not call third-party providers directly or understand provider-specific payloads. The route returns normalized dictionary payloads; provider execution and error-to-response mapping live in the server service layer.

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
- subtitle providers: Supadata or `yt-dlp`
- dictionary providers: OpenRouter or Free Dictionary

Environment selection currently happens through `app/env.example` keys:

- `SUBTITLE_PROVIDER`
- `SUPADATA_API_KEY`
- `YT_DLP_PATH`
- `DICTIONARY_PROVIDER`
- `OPENROUTER_API_KEY`
- `OPENROUTER_DICTIONARY_MODEL`
- `OPENROUTER_DICTIONARY_PROMPT`

## Safe Change Patterns

- UI-only changes should avoid changing provider contracts.
- Client hooks may orchestrate browser events and fetch normalized API payloads, but they should not embed provider-specific logic.
- Provider changes should preserve the contracts in `app/src/types/`.
- Cache changes should preserve graceful failure. Cache read/write failures must not break normal requests.
- If changing environment variables or defaults, update `app/env.example` and this doc set in the same change.

## ADR-0001: Module Ownership For Retrieval And Playback

### Status

Accepted on March 22, 2026.

### Context

The app had started to drift in two ways:

- vendor-specific dictionary and subtitle shaping was leaking toward UI code,
- route handlers were accumulating cache, provider, fallback, and normalization work.

That made it harder to reason about safe changes and obscured which layer owned which behavior.

### Decision

Use a thin-route, service-backed architecture with normalized app-level contracts.

Ownership is:

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
