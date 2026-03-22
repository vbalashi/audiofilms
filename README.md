# AudioFilms

Phrase-based listening practice for YouTube videos. The app lets a learner move phrase by phrase through subtitles, hide or reveal text, and request dictionary-style definitions for clicked words.

## Canonical Docs

- Repo overview and navigation: this file
- Setup and local runbook: [app/README.md](/home/khrustal/dev/audiofilms/app/README.md)
- Architecture, boundaries, and validation expectations: [ARCHITECTURE.md](/home/khrustal/dev/audiofilms/ARCHITECTURE.md)
- Product intent and scope: [docs/intent/index.md](/home/khrustal/dev/audiofilms/docs/intent/index.md)
- Current dictionary guidance: [docs/dictionary/index.md](/home/khrustal/dev/audiofilms/docs/dictionary/index.md)

## Repo Layout

- `/home/khrustal/dev/audiofilms/app`: Next.js application
- `/home/khrustal/dev/audiofilms/docs/intent`: product intent and scope notes
- `/home/khrustal/dev/audiofilms/docs/exec-plans`: active and completed execution plans
- `/home/khrustal/dev/audiofilms/docs/tech-debt`: known cleanup targets

## Provider Defaults

Current runtime defaults are:

- Subtitle provider: `supadata`
- Subtitle fallback: `yt-dlp`
- Dictionary provider: `openrouter`
- Dictionary fallback: `free-dictionary`

These defaults are implemented in:

- [providers/index.ts](/home/khrustal/dev/audiofilms/app/src/lib/providers/index.ts)
- [providers/dictionary/index.ts](/home/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/index.ts)
- [env.example](/home/khrustal/dev/audiofilms/app/env.example)

## Setup

Application setup lives in [app/README.md](/home/khrustal/dev/audiofilms/app/README.md) and should be treated as the canonical setup path.

Quick start:

```bash
cd app
npm install
cp env.example .env.local
npm run dev
```

For the default runtime path, set:

```bash
SUBTITLE_PROVIDER=supadata
SUPADATA_API_KEY=...
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=...
```

## Validation

Run from `/home/khrustal/dev/audiofilms/app`:

```bash
npm run lint
npm run build
```

## Current Scope

- Embedded YouTube playback
- Subtitle retrieval through configurable providers
- Phrase-based playback and blind/read modes
- Dictionary lookups through configurable providers
- File-backed subtitle and video metadata caches

## Notes

- `yt-dlp` is no longer the primary subtitle path; it is the explicit local fallback provider.
- `free-dictionary` is no longer the primary dictionary path; it is the explicit English-only fallback.
- Historical implementation notes have been moved under [docs/archive/dictionary](/home/khrustal/dev/audiofilms/docs/archive/dictionary).
