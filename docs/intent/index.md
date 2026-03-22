# Intent

## Product Intent

AudioFilms is a listening-practice web app built around YouTube videos, phrase looping, and on-demand dictionary lookups.

The current implementation is centered on:

- loading a video by URL or id,
- fetching subtitles in the most useful available language,
- practicing one phrase at a time,
- revealing text only when needed,
- looking up clicked words with language-aware dictionary handling.

## What Matters Most

- subtitle retrieval must degrade predictably when providers fail,
- phrase playback should stay simple and legible,
- provider choices must remain swappable through environment configuration,
- setup requirements must be explicit for humans and agents.

## Current Non-Goals

- authentication and persistence,
- mobile-first support,
- broad workflow/process overhead,
- complex deployment orchestration inside this repo.

## Canonical Docs

- Start with `AGENTS.md` for repo navigation.
- Use `ARCHITECTURE.md` for boundaries and validation.
- Treat the existing root `README.md` and `app/README.md` as historical/product context until they are consolidated.
