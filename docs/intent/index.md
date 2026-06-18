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

## Next Product Focus

After the current stabilization work, product development should resume in this order:

1. `YouTube extension backend/UI contract review` so UI and backend agents share one state model,
2. `dictionary result caching` to improve lookup UX and reduce provider cost/latency,
3. `provider fallback policy and user-facing error states` to make degradation explicit and reliable.

Other feature work should stay secondary until those areas are in place.

## Current Non-Goals

- broad first-party AudioFilms authentication and persistence; the YouTube
  extension may still use a scoped 2000NL Connect session for dictionary
  progress/actions,
- mobile-first support,
- broad workflow/process overhead,
- complex deployment orchestration inside this repo.

## Canonical Docs

- Start with `AGENTS.md` for repo navigation.
- Use `ARCHITECTURE.md` for boundaries and validation.
- Use `README.md` for repo-level overview and navigation.
- Use `app/README.md` for setup and local runbook steps.
- Use `docs/dictionary/index.md` for current dictionary-specific guidance.
- Use `docs/intent/subtitle-retrieval-strategy.md` for current subtitle access, manual-vs-auto, and ASR fallback notes.
- Use `docs/intent/youtube-extension-designer-brief.md` when handing the current YouTube extension UI to a designer for regrouping, hierarchy, and state-model review.
- Use `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md` when handing backend/API gaps from the YouTube extension redesign to an architect or backend agent.

For the YouTube extension redesign, the designer brief and backend/UI contracts
are the current source of truth. Older active plans such as
`docs/exec-plans/active/youtube-shadowing-extension-mvp.md`,
`docs/exec-plans/active/youtube-extension-stabilization-and-rebuild.md`, and
`docs/exec-plans/active/shadowing-mvp-ui-todo.md` are historical or operational
context only when they conflict with the current brief/contracts.
