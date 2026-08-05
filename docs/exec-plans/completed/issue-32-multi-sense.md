# AudioFilms Extension Multi-Sense SenseCard

Status: completed
Issue: `vbalashi/audiofilms#32`
Branch: `codex/audiofilms-32-multi-sense`
Worktree: `/Users/khrustal/adhoc/audiofilms-issue-32-multisense`
Base: `4b6e4e2e0ae4760971edbfc565aa54d5455d77e3`

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
- 2026-07-30: projection, presentation, grouped DOM, independent expansion,
  group translation, and exact entry action seams implemented test-first.
- 2026-07-30: approved Pen components compared against Full and Narrow static
  fixtures in normal Chrome. A fixture-only width leak was found visually and
  corrected before runtime validation.
- 2026-07-30: focused installed-extension Chrome smoke passed with one semantic
  group, two stable entry ids, first-expanded/second-collapsed initial state,
  group translation for both entries, and independent expansion exposing the
  second entry's own learning actions. The unpacked extension source was
  restored to `/Users/khrustal/dev/audiofilms/extensions/youtube-shadowing`
  after the check.
- 2026-07-30: independent review caught three pre-commit gaps. The single-sense
  renderer regression was fixed first. Runtime translation overlays are now
  joined by stable card/entry id, `report-content` opens the existing issue
  dialog with the exact capability target in diagnostics, and Full/Narrow use
  their approved responsive tool and review-button layouts.
- 2026-07-30: post-fix validation passed: extension unit smoke, 14 dictionary
  test files / 58 tests, ESLint, Next production build, and `git diff --check`.
  Browser geometry evidence confirms Full at 520 px uses 36 px tools and one
  review row; Narrow at 340 px uses 28 px tools and two review rows.
- 2026-07-30: final visual QA caught and closed one footer alignment issue.
  `Melden` and `Markeer als bekend` now share one quiet footer row in both
  layouts; `Melden` remains absent from collapsed meanings. Independent final
  visual QA and Spec re-review both returned PASS with no P0-P2 findings.
- 2026-08-05: exact feature SHA `8c98a9ee0a82f82f1bd8688d45527648ad13574a`
  was revalidated (58/58 dictionary tests, extension unit smoke, syntax, lint,
  and production build) and squash-merged through PR #38. Merge SHA
  `eae9c9fd9bb0fc521d748f1d868448b9753f75c5` has the exact reviewed feature
  tree. Issue #32 is closed; cross-product rollout remains owned by 2000NL #79.
