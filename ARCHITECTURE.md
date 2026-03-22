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

These files own user interaction, route-level loading/error states, the YouTube embed surface, and word-click behavior.

### Client State

- `app/src/store/playerStore.ts`

This is the source of truth for playback mode, current phrase index, video id, and loaded subtitle language.

### Subtitle Retrieval

- `app/src/app/api/get-subs/route.ts`
- `app/src/lib/providers/`
- `app/src/types/subtitles.ts`

The API route is the boundary between the UI and subtitle providers. Provider selection is environment-driven. The route is also responsible for cache lookup/write and the sample-video fallback path.

### Video Metadata

- `app/src/app/api/video-info/route.ts`
- `app/src/lib/youtubeMetadata.ts`
- `app/src/lib/videoInfoCache.ts`

This path exists to support language selection and avoid redundant provider work.

### Dictionary Lookup

- `app/src/app/api/dict/route.ts`
- `app/src/lib/providers/dictionary/`
- `app/src/types/dictionary.ts`

Dictionary lookups are server-mediated. The UI should not call third-party providers directly.

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
- Provider changes should preserve the contracts in `app/src/types/`.
- Cache changes should preserve graceful failure. Cache read/write failures must not break normal requests.
- If changing environment variables or defaults, update `app/env.example` and this doc set in the same change.

## Validation

Run from `app/`:

```bash
npm run lint
npm run build
```

Known issue:

- `npm run lint` is currently red because of existing provider typing and unused-variable issues. Treat that as baseline debt until fixed.
