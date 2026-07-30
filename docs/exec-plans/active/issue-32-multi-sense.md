# AudioFilms Extension Multi-Sense SenseCard

Status: active
Issue: `vbalashi/audiofilms#32`
Branch: `codex/audiofilms-32-multi-sense`
Worktree: `/Users/khrustal/adhoc/audiofilms-issue-32-multisense`
Base: `2da36add68ac8248a398cfbb38dd5d89f27341b1`

## Goal

Render one grouped headword with multiple dictionary meanings while keeping
every meaning an independently learnable SenseCard with its own stable identity,
state, actions, translation content, and expanded/collapsed UI state.

Approved Pen references:

- `10.16.01 · COMPONENT · MULTI-SENSE / FULL / v1.0 · APPROVED`
- `10.16.02 · COMPONENT · MULTI-SENSE / NARROW / v1.0 · APPROVED`

## In Scope

- project every Platform V2 `sense-card` entry instead of filtering out
  multi-sense groups;
- group entries by stable `headwordGroupId`;
- keep actions and feedback targeted by stable `entryId` and exact capability
  target;
- one group-level headword/metadata/translation/audio tool area;
- one independently expanded or collapsed meaning surface per entry;
- per-entry translation visibility and translation rendering;
- full and narrow static visual fixtures;
- contract, presentation, DOM, action-target, and regression validation.

## Out of Scope

- the 2000NL application screen;
- settings/navigation redesign;
- parser or Platform V2 schema changes;
- loading/error architecture beyond current lookup-level behavior;
- word-details popovers, inflection tables, synonym/antonym panels;
- production flag rollout or deployment.

## Contract And Test Seams

These seams were approved by the single-sense tracer and issue acceptance
criteria:

1. `projectSenseCardLookup()` preserves all stable group and entry identities.
2. Pure presentation maps one group into independent meaning view models
   without positional translation or state joins.
3. DOM rendering targets callbacks with the exact entry/card wrapper.
4. Mutation payloads preserve the exact Platform capability target and refresh
   lookup after success.

## Implementation Sequence

1. Add a failing projection test for two senses with different entry/state/action
   targets, then include both entries in the shallow projection.
2. Add a failing presentation test for group header plus independent entry
   expansion, state, translation, and actions.
3. Add the grouped DOM/render-workflow seam while preserving the single-sense
   and legacy render paths.
4. Extend the semantic mock and static fixture with approved full/narrow
   multi-sense states.
5. Validate exact behavior, visual hierarchy, and regression suites; run
   Standards and Spec reviews before commit/push.

## Rollback

The semantic path remains feature-gated by
`DICTIONARY_2000NL_SENSE_CARD_V2`. Disabling it returns to the existing V1
overlay. Legacy cards and generated drafts remain on their current renderers.

## Checkpoints

- 2026-07-30: issue claimed in an isolated worktree after #28 and #31 were
  integrated. Claimed resources are the AudioFilms Platform V2 shallow
  projection and approved Pen components `10.16.01`/`10.16.02`.
