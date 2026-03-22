# AGENTS.md

This repo should be treated as a `light` Harness-mode application project.

## Repo Map

- `app/`: Next.js application and all runtime code.
- `app/src/app/`: App Router pages and API routes.
- `app/src/components/`: client UI and playback surfaces.
- `app/src/store/`: Zustand player state.
- `app/src/lib/`: provider implementations, metadata helpers, and file-backed caches.
- `app/src/types/`: shared runtime contracts for subtitles and dictionary lookups.
- `docs/intent/`: current product intent and scope notes for agent work.
- `docs/exec-plans/active/`: plans for in-flight work.
- `docs/exec-plans/completed/`: closed plans worth keeping.
- `docs/tech-debt/`: known structural issues and cleanup targets.

## Working Rules

- Prefer changes inside `app/` unless the task is explicitly about repo-level docs.
- Keep API route changes aligned with provider interfaces in `app/src/lib/providers/` and `app/src/lib/providers/dictionary/`.
- Treat `.subtitle-cache/` and `.video-info-cache/` as disposable local artifacts, not source of truth.
- Do not spread environment assumptions across random markdown files. Add or update canonical setup notes in `ARCHITECTURE.md` or `docs/intent/`.
- When a change alters runtime boundaries, provider selection, or validation steps, update the matching doc in this repo bootstrap.

## Validation

Run from `app/` unless noted otherwise:

```bash
npm run lint
npm run build
```

If a task touches provider setup or environment handling, also verify:

```bash
test -f env.example
```

## Current State

- `npm run lint` is currently failing on existing TypeScript/ESLint issues in provider code.
- There is substantial pre-existing work in the tree; do not revert unrelated user changes.
