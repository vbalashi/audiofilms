# AudioFilms Extension Single-Sense SenseCard Tracer

Status: integrated
Issue: `vbalashi/audiofilms#31`
Branch: `codex/audiofilms-31-single-sense`
Worktree: `/Users/khrustal/adhoc/audiofilms-issue-31-sensecard-tracer`
Base: `978e7c97d2ac5502a84b0bc7ef2ce78325d1ed8a`
Integrated SHA: `2da36add68ac8248a398cfbb38dd5d89f27341b1`
Stack dependency: integrated with `vbalashi/audiofilms#28`

## Goal

Implement the approved narrow, single-sense SenseCard in the AudioFilms Chrome
Extension as one semantic vertical slice. The extension must render stable
2000NL Platform V2 concepts and capabilities rather than infer meaning from
display labels or array positions.

The approved visual references are:

- `2000nl/docs/architecture/evidence/sense-card-visual-spec-v1/20.10-single-sense-states.png`
- `2000nl/docs/architecture/evidence/sense-card-visual-spec-v1/20.81-single-sense-translation-matrix.png`

## In Scope

- an additive AudioFilms projection for the Platform V2 headword group and
  single sense entry;
- translated and untranslated card states;
- `start-learning`, `mark-known`, `undo-known`, and four review actions when
  those exact capabilities are present;
- extension-owned interface copy in English, Dutch, and Russian, selected from
  the user's interface language;
- the approved narrow visual hierarchy;
- contract, pure presentation, extension smoke, and real-Chrome visual checks.

## Out of Scope

- the 2000NL main/training screen;
- multi-sense layout;
- Settings or navigation redesign;
- subtitle, timing, phrase, or playback behavior;
- parser changes;
- production deployment or enabling a new production feature flag.

## Contract Rules

- 2000NL owns dictionary semantics, card state, capability targets, and action
  revisions.
- AudioFilms owns only the shallow transport/projection and extension UI.
- The extension never reconstructs action targets and never maps translations
  by array position.
- A mutation is rendered only from an exact capability returned by 2000NL.
- A completed mutation reloads the semantic card from the backend.
- `mark-known` has a durable inverse through the returned `undo-known`
  capability.
- Display strings such as `Meaning`, `Learn`, and `Marked as known` are client
  localization keys, not semantic identifiers.

## Implementation Sequence

### 1. Characterize and Freeze Seams

- add failing pure tests for semantic single-sense presentation;
- add route/projection tests for the Platform V2 bridge;
- record the existing module loading, action, and lookup boundaries.

Exit: tests describe the intended contract without changing visible behavior.

### 2. Backend Platform V2 Bridge

- add an additive feature-gated Platform V2 lookup path;
- preserve the existing V1 path when the flag is off;
- pass through stable group, entry, content-node, translation, state, and
  capability fields without display-label inference;
- accept and forward exact Platform V2 action requests.

Exit: backend tests cover lookup, guest/read-only behavior, exact action target
forwarding, invalid target rejection, and `undo-known`.

### 3. Extension Semantic Renderer

- add focused presentation and DOM modules instead of expanding the broad
  legacy renderer;
- render only the single-sense tracer from the new contract;
- keep the existing renderer for legacy responses and non-tracer cases;
- add English, Dutch, and Russian interface copy;
- render translation, learning, review, known, and undo states.

Exit: pure smoke tests cover all states and confirm that no positional
translation or display-label inference is used.

### 4. Real Chrome and Visual QA

- run extension syntax and unit smoke;
- run the canonical normal-profile Chrome smoke without changing subtitle or
  timing behavior;
- capture the approved reference and implementation at matching density in one
  comparison input;
- fix all P0, P1, and P2 visual findings;
- record the final result in `design-qa.md`.

Exit: real Chrome behavior passes and `design-qa.md` says `final result: passed`.

### 5. Review-Ready Checkpoint

- run required app checks if backend files changed;
- run standards, specification, architecture/security, and visual reviews;
- commit and push an exact SHA with a clean worktree;
- open a stacked draft PR against the PR #28 branch unless #28 has already
  integrated;
- leave issue and execution plan open until integration is verified.

## Rollback and Containment

- the new lookup path stays behind an additive feature flag;
- disabling the flag restores the existing V1 response and renderer;
- legacy rendering remains present during the tracer;
- no database migration or production configuration change is part of this
  issue;
- if PR #28 changes its renderer seam, rebase the tracer and rerun the focused
  extension suites before review.

## Checkpoints

- 2026-07-30: issue claimed; isolated worktree created from the current PR #28
  renderer branch; 2000NL screen integration explicitly excluded.
- 2026-07-30: semantic Platform V2 lookup/action projection, exact capability
  forwarding, narrow extension renderer, EN/NL/RU locale catalog, and the
  approved translation/learning/known/undo states implemented behind the
  additive lookup flag.
- 2026-07-30: real-Chrome fixture comparison converged after three recorded visual
  iterations. Independent visual QA reported no P0/P1/P2 findings; evidence is
  recorded in `design-qa.md`.
- 2026-07-30: the AudioFilms session bridge now preserves an optional
  `interfaceLanguageCode` independently from the translation target. Until
  2000NL issue #52 exposes that preference in production, the extension uses
  the browser language fallback rather than creating a second local preference.
- 2026-07-30: rebased onto the reviewed PR #28 fixes, revalidated with 57 app
  tests, extension unit smoke, lint, production build, and the static visual
  fixture, then fast-forward integrated at exact SHA
  `2da36add68ac8248a398cfbb38dd5d89f27341b1`.
