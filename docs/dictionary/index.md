# Dictionary Docs

## Purpose

This is the maintained entry point for dictionary-related guidance in this repo.

## Current Source Of Truth

- Runtime provider defaults: [app/env.example](/Users/khrustal/dev/audiofilms/app/env.example)
- Dictionary provider factory: [app/src/lib/providers/dictionary/index.ts](/Users/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/index.ts)
- Provider implementation notes: [app/src/lib/providers/dictionary/README.md](/Users/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/README.md)
- Architecture boundaries: [ARCHITECTURE.md](/Users/khrustal/dev/audiofilms/ARCHITECTURE.md)
- 2000NL platform boundary: [docs/adr/0002-2000nl-dictionary-platform-boundary.md](/Users/khrustal/dev/audiofilms/docs/adr/0002-2000nl-dictionary-platform-boundary.md)

## Current Model

- Default dictionary provider: `openrouter`
- Supported dictionary providers: `2000nl`, `openrouter`, `openai`, `free-dictionary`
- 2000NL is the preferred authority for Dutch curated lookup, progress context, explicit card actions, and per-card translation.
- UI and extension consumers use normalized dictionary payloads from `/api/dict`
- 2000NL rich consumers render AudioFilms `cards[]`; they do not parse 2000NL `entry.raw`.
- Explicit 2000NL mutations go through `/api/dict/actions`; per-card translations go through `/api/dict/translation`.
- Vendor-specific logic stays under `app/src/lib/providers/dictionary/`

## What To Update When Dictionary Behavior Changes

Update these together:

- [app/env.example](/Users/khrustal/dev/audiofilms/app/env.example)
- [app/src/lib/providers/dictionary/index.ts](/Users/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/index.ts)
- [app/src/lib/providers/dictionary/README.md](/Users/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/README.md)
- [ARCHITECTURE.md](/Users/khrustal/dev/audiofilms/ARCHITECTURE.md) if module ownership or boundaries change
- [docs/adr/0002-2000nl-dictionary-platform-boundary.md](/Users/khrustal/dev/audiofilms/docs/adr/0002-2000nl-dictionary-platform-boundary.md) if the 2000NL authority/proxy boundary changes

## Archived Notes

Older implementation notes, troubleshooting writeups, and migration summaries were moved to [docs/archive/dictionary](/Users/khrustal/dev/audiofilms/docs/archive/dictionary). Treat them as historical context, not current setup guidance.
