# AudioFilms

Phrase-based listening practice for YouTube videos. The app lets a learner move phrase by phrase through subtitles, hide or reveal text, and request dictionary-style definitions for clicked words.

## Canonical Docs

- Repo overview and navigation: this file
- Setup and local runbook: [app/README.md](app/README.md)
- Architecture, boundaries, and validation expectations: [ARCHITECTURE.md](ARCHITECTURE.md)
- Product intent and scope: [docs/intent/index.md](docs/intent/index.md)
- Current dictionary guidance: [docs/dictionary/index.md](docs/dictionary/index.md)

## Repo Layout

- `app`: Next.js application
- `extensions/youtube-shadowing`: Chrome extension spike for YouTube-page shadowing controls
- `docs/intent`: product intent and scope notes
- `docs/exec-plans`: active and completed execution plans
- `docs/tech-debt`: known cleanup targets

## Provider Defaults

Current runtime defaults are:

- Subtitle provider: `yt-dlp`
- Subtitle fallback: `supadata` when `SUPADATA_API_KEY` is configured
- Dictionary provider: `openrouter`
- Dictionary candidates: `2000nl`, `openai`, `openrouter`, and English-only `free-dictionary` where configured

These defaults are implemented in:

- [providers/index.ts](app/src/lib/providers/index.ts)
- [providers/dictionary/index.ts](app/src/lib/providers/dictionary/index.ts)
- [env.example](app/env.example)

## Setup

Application setup lives in [app/README.md](app/README.md) and should be treated as the canonical setup path.

Quick start:

```bash
cd app
npm install
cp env.example .env.local
npm run dev
```

For the default local runtime path, set:

```bash
SUBTITLE_PROVIDER=yt-dlp
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=...
```

For first remote dogfood, use the container runbook in [docs/runbooks/audiofilms-backend-deployment.md](docs/runbooks/audiofilms-backend-deployment.md). The public facade is expected at `https://audiofilms-api.dilum.io`, with `/api/health`, `/api/get-subs`, `/api/dict`, and `/api/asr/jobs` as the stable API surface.

## Validation

Run from `app`:

```bash
npm run lint
npm run build
```

## Current Scope

- Embedded YouTube playback
- Experimental Chrome extension for direct YouTube-page phrase navigation
- Subtitle retrieval through configurable providers
- Phrase-based playback and blind/read modes
- Dictionary lookups through configurable providers
- File-backed subtitle and video metadata caches

## Notes

- `yt-dlp` is the default subtitle path for local and small-host deployments. Supadata is the paid fallback when configured.
- `free-dictionary` remains an English-only dictionary fallback.
- Historical implementation notes have been moved under [docs/archive/dictionary](docs/archive/dictionary).
