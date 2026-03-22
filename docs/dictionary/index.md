# Dictionary Docs

## Purpose

This is the maintained entry point for dictionary-related guidance in this repo.

## Current Source Of Truth

- Runtime provider defaults: [app/env.example](/home/khrustal/dev/audiofilms/app/env.example)
- Dictionary provider factory: [app/src/lib/providers/dictionary/index.ts](/home/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/index.ts)
- Provider implementation notes: [app/src/lib/providers/dictionary/README.md](/home/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/README.md)
- Architecture boundaries: [ARCHITECTURE.md](/home/khrustal/dev/audiofilms/ARCHITECTURE.md)

## Current Model

- Default dictionary provider: `openrouter`
- Fallback dictionary provider: `free-dictionary`
- UI consumes normalized dictionary payloads from `/api/dict`
- Vendor-specific logic stays under `app/src/lib/providers/dictionary/`

## What To Update When Dictionary Behavior Changes

Update these together:

- [app/env.example](/home/khrustal/dev/audiofilms/app/env.example)
- [app/src/lib/providers/dictionary/index.ts](/home/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/index.ts)
- [app/src/lib/providers/dictionary/README.md](/home/khrustal/dev/audiofilms/app/src/lib/providers/dictionary/README.md)
- [ARCHITECTURE.md](/home/khrustal/dev/audiofilms/ARCHITECTURE.md) if module ownership or boundaries change

## Archived Notes

Older implementation notes, troubleshooting writeups, and migration summaries were moved to [docs/archive/dictionary](/home/khrustal/dev/audiofilms/docs/archive/dictionary). Treat them as historical context, not current setup guidance.
