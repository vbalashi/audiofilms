# YouTube Extension Dictionary UI Refresh

Status: draft plan for June 22, 2026 intent review.

This plan turns current dogfood feedback into separately trackable UI and
contract slices for `extensions/youtube-shadowing/`. It does not change the
2000NL authority boundary from ADR-0002: AudioFilms renders backend-projected
cards and submits explicit 2000NL display actions; it does not invent progress
state locally.

## Grounding

- Intent source: `docs/intent/youtube-extension-designer-brief.md`, especially
  `Dictionary Panel Refinement Intent`.
- Contract source: `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`.
- Boundary source: `docs/adr/0002-2000nl-dictionary-platform-boundary.md`.
- 2000NL visual source: `/Users/khrustal/dev/2000nl/apps/ui/docs/design-guide.md`.
- MCP 21st.dev scan: useful patterns were compact icon+text buttons, loading
  feedback, and flat-edge controls; avoid pill morphing and circular controls
  because this overlay target needs stricter rectangular controls.

## Product Outcomes

1. The dictionary panel opens directly on useful cards, not on explanatory
   scaffolding.
2. The selected word and card count stay visible in the header.
3. Cards show the dictionary match only, with article/POS/source metadata kept
   compact, meaningful, and backend-projected.
4. Examples, translation, account, debug, and bulk expansion are discoverable
   but not dominant.
5. Learning/review actions visibly acknowledge clicks and reflect refreshed
   2000NL state.
6. The phrase ribbon and dictionary panel share day/night theme behavior.

## Slice 0: Baseline Evidence

Goal: capture the current state before changes.

Tasks:

- Save a screenshot of the current YouTube overlay with `opbouwen` cards open.
- Capture lookup JSON for `opbouwen` and at least one `zwaar`/`zware` case where
  action buttons look suspicious.
- Record whether the lookup response already contains `displayActions` for
  `Learn`/`Known` versus review grades.

Acceptance:

- Evidence shows whether the `zwaar` issue is backend payload, AudioFilms
  projection, or extension rendering.
- No product behavior is changed in this slice.

Suggested verification:

- Browser smoke on the current YouTube page.
- One saved JSON fixture or copied response for each suspicious lookup case.

## Slice 1: Header And Account IA

Goal: make the panel header lookup-first.

Tasks:

- Replace default `Dictionary`/track subtitle with clicked form plus card count.
- Move `vbalashi@gmail.com`/account identity into a compact icon button in the
  main panel header.
- Keep the existing account popover behavior behind that icon.
- Replace text `Close` rendering with an icon-only close button and accessible
  label.

Acceptance:

- Header reads `opbouwen` and `3 cards found` for the screenshot case.
- Connected account is visible as a small stateful icon, not as an email pill.
- Email remains available in the account popover.

Suggested verification:

- DOM smoke for header text and account popover.
- Visual screenshot at current desktop viewport.

## Slice 2: Remove Redundant Intro Blocks

Goal: start the result body with the first dictionary card.

Tasks:

- Remove selected-word recap card for ready lookup results.
- Remove default context block above cards.
- Remove `Dictionary match` and card-count preface from the body.
- Keep loading, error, empty, and guest states explicit.

Acceptance:

- Ready lookup body starts with the first `.af-overlay-card`.
- Loading/error/no-match states still give clear feedback.

Suggested verification:

- DOM smoke for ready lookup structure.
- Browser screenshot with `opbouwen`.

## Slice 3: Card Title And Metadata Chips

Goal: match learner expectations for dictionary cards.

Tasks:

- Change overlay card title from `clicked -> headword` to just `headword`.
- Render Dutch article `de`/`het` before noun titles as a subdued article
  marker.
- Require explicit backend-projected article metadata for `de`/`het` placement;
  the UI may choose placement but must not infer articles from headwords or
  arbitrary chip labels.
- Hide generic `nl` chip for Dutch-only lookup context.
- Keep useful POS and source chips, with small quiet rectangular styling and
  dense readable spacing.
- Ensure `dictionary.name` is already the concise learner-facing source name,
  for example `VanDale` rather than `VanDale Dutch`.
- Audit projected chips so source, article, POS, and language are not conflated.
- Do not add UI-side source-label heuristics in the extension. Do not introduce
  parallel `chip.label` source-name cleanup. The source chip should render from
  the backend-provided `dictionary.name` when source metadata is shown.
- Ignore `entry.languageCode` in the normal learner UI for this single-language
  dictionary panel; keep it as metadata/diagnostics only.

Acceptance:

- `zware` lookup can show panel title `zware` and card title `bevalling`,
  not `zware -> bevalling`.
- `de`/`het` appears as article metadata before noun title, not as an equal
  language chip.
- Article rendering is backed by explicit overlay metadata from 2000NL/AudioFilms
  projection.
- `nl` does not render as a learner-facing chip in the normal Dutch panel.
- Source chip reads `VanDale` when that is the backend-projected source label.
- Extension source-chip rendering contains no `VanDale Dutch -> VanDale`
  cleanup rule.
- Extension does not render `entry.languageCode`/`nl` as a normal chip.

Suggested verification:

- Unit-level helper tests for title/chip normalization if helpers are extracted.
- Browser fixture with `zware -> bevalling`.

## Slice 4: Examples Expand/Collapse

Goal: replace technical `Details` with learner-facing examples.

Tasks:

- Replace browser-native details arrow with an icon button.
- Rename section to `Examples` or `Show examples`.
- Remove per-block headings such as `Example`.
- Add panel-level expand/collapse-all icon button near the card list header.
- Persist the expand/collapse-all preference globally for the extension user in
  extension storage/local storage.

Acceptance:

- Individual card examples can be expanded/collapsed.
- Expand/collapse-all changes all visible cards and is remembered globally after
  rerender or page reload.
- No browser default disclosure arrow is visible.

Suggested verification:

- DOM interaction test for one card and all cards.
- Reload smoke to confirm persistence.

## Slice 5: Per-Element Translation Reveal

Goal: make dictionary translation match 2000NL card behavior.

Tasks:

- Replace text `Translate` with a compact icon button.
- Treat translation as toggleable per card: click to show, click again to hide.
- Render available translation under the translated source element.
- If the backend only returns block-level overlay translation, render a
  contained block now and mark line-level placement as blocked on stable
  `sections[].id` or `sourcePath`.

Acceptance:

- Translation button is compact and visually separate from progress actions.
- Repeated click hides shown translation without another unnecessary network
  request when cached.
- Translation text appears below related source text wherever current payload
  allows it.

Suggested verification:

- Interaction smoke for show/hide.
- Contract check for whether card translation payload has stable source paths.

## Slice 6: Progress Actions And Feedback

Goal: make learning/review actions trustworthy.

Tasks:

- Remove the `Progress` label.
- Add pressed/loading/success/error visual states to progress buttons.
- Keep progress labels as backend-provided/current contract labels: `Learn`,
  `Known`, `Again`, `Hard`, `Good`, `Easy`. Do not translate/localize them in
  this slice.
- Keep layout stable while action requests and refreshed lookup run.
- After `start-learning`, show feedback such as `Started learning` and update
  card background subtly after refreshed state arrives.
- Verify review-grade actions use `review-card` plus the right result id and
  a stable `turnId` where required.
- Investigate the `zwaar`/`zware` mismatch before changing fallback rendering.

Acceptance:

- Clicking `Learn` gives immediate visual feedback and no card jump.
- Cards already in learning/review phase show four review controls when the
  backend/projection says they should.
- Labels remain the current contract labels and are not locally translated.
- If a card still shows `Learn`/`Known`, evidence identifies whether the problem
  is 2000NL response, AudioFilms projection, or extension rendering.

Suggested verification:

- Mocked service-worker/action smoke for success and error.
- Fixture-based contract test for new, learning, reviewing, hidden/frozen cards.

## Slice 7: Shared Theme And Control Shape

Goal: make ribbon and dictionary feel like one overlay.

Tasks:

- Introduce shared CSS tokens for light/dark panel, card, border, text, muted,
  translation, success, hard, fail, and easy states.
- Respect system `prefers-color-scheme`.
- Add manual day/night/system override icon control.
- Apply the override to the full AudioFilms extension surface, including the
  floating `AudioFilms On/Off` toggle, but not to YouTube itself.
- Apply stricter 6-8px radius to UI controls and chips; avoid oval system
  buttons.
- Apply the same small uppercase/mono label style currently used for `PROGRESS`
  to system labels and chips, unless a learner-facing word needs display type.
- Remove or demote the `Phrase navigation` chip.

Acceptance:

- Ribbon and dictionary share color tokens in light and dark.
- Manual theme override works and persists.
- Floating toggle follows the same AudioFilms theme as the ribbon and dictionary.
- Controls use consistent icon/button styling and do not look pill-shaped.

Suggested verification:

- Visual screenshots in light, dark, and manual override.
- Narrow/wide viewport smoke to catch overlap.

## Slice 8: Documentation Sync

Goal: keep extension docs aligned with the changed workflow.

Tasks:

- Update `extensions/youtube-shadowing/README.md` for changed header/account,
  examples, translation, theme, and progress behavior.
- Update `docs/intent/youtube-extension-validation-matrix.md` with dictionary
  panel scenarios.
- Update `docs/intent/youtube-extension-agent-runbook.md` if reload/smoke steps
  or expected screenshots change.

Acceptance:

- A future agent can reload the extension, test the dictionary panel, and know
  what evidence to capture.

## Approved Test Plan

Minimum first implementation pass:

- Contract/fixture tests for projection/render data:
  - `dictionary.name` is the concise learner-facing source label, for example
    `VanDale`;
  - `entry.languageCode`/`nl` does not render as learner-facing chip metadata;
  - explicit article metadata is available for `de`/`het` placement;
  - progress actions are correct for new, learning, reviewing, hidden/frozen
    card states.
- Browser smoke on the YouTube overlay for `opbouwen` and `zware`.
- Screenshot review for light/dark appearance after the theme slice.

Deferred until the related slices are implemented:

- Storage persistence tests for examples expand/collapse-all and theme override.
- Service-worker mocked action tests for progress success/error feedback.
- No-match browser case.

## Progress Tracking

Track implementation in this file, not in scattered notes. Each slice should
move through these states:

- `planned`: intent accepted, no code started.
- `in-progress`: code or tests are being changed.
- `code-ready`: implementation exists, verification still pending.
- `verified`: acceptance criteria passed and evidence is linked.
- `blocked`: the next step needs a backend contract, missing fixture, or product
  decision.

| Slice | Status | Required evidence | Open defects / notes |
| --- | --- | --- | --- |
| 0. Baseline evidence | verified | `youtube-extension-dictionary-ui-refresh-evidence/slice-0-baseline/README.md`; `opbouwen-ready-dom-snapshot.json`; `youtube-dom-snapshot.json`; screenshots for both states | Raw service-worker JSON capture was unavailable through AppleScript options-page context; use contract tests or a temporary debug helper before Slice 3 if raw payload is needed. |
| 1. Header and account IA | verified | `youtube-extension-dictionary-ui-refresh-evidence/slice-1-header-account/README.md`; DOM smoke and desktop screenshot |  |
| 2. Remove redundant intro blocks | verified | `youtube-extension-dictionary-ui-refresh-evidence/slice-2-ready-body/README.md`; DOM smoke proving first ready body item is a card |  |
| 3. Card title and metadata chips | verified | `youtube-extension-dictionary-ui-refresh-evidence/slice-3-card-metadata/README.md`; fixture/contract test plus `zware` browser smoke | Remote API still showed old `VanDale Dutch`/no-article payload during browser smoke; local projection tests verify the intended backend shape. |
| 4. Examples expand/collapse | verified | `youtube-extension-dictionary-ui-refresh-evidence/slice-4-examples/README.md`; DOM interaction smoke; page-reload persistence smoke |  |
| 5. Per-element translation reveal | verified | `youtube-extension-dictionary-ui-refresh-evidence/slice-5-translation/README.md`; show/hide/show-again smoke | Current translation response is card-level overlay text, so the UI renders a contained block under the card text; line-level placement needs stable section/source ids from the backend. |
| 6. Progress actions and feedback | verified | `youtube-extension-dictionary-ui-refresh-evidence/slice-6-progress/README.md`; mock browser action smoke; projection contract test | `zware` baseline shows mixed `displayActions` by card: cards with `Learn`/`Known` are projected as new/encountered, while the `dwingend` card had review actions. Direct guest API lookup cannot confirm personalized state without user bearer. |
| 7. Shared theme and control shape | planned | Light/dark screenshots; persistence test when storage slice lands |  |
| 8. Documentation sync | planned | README/runbook/validation-matrix diff review |  |

Scenario ledger:

| Scenario | Expected proof | Status | Evidence |
| --- | --- | --- | --- |
| `opbouwen` lookup | Header shows `opbouwen` and card count; body starts with first card | verified through Slice 2 | `youtube-extension-dictionary-ui-refresh-evidence/slice-2-ready-body/opbouwen-ready-body-dom.json` |
| `zware` lookup | Panel title is clicked form; card title is match; article/source chips are correct | verified through Slice 3; source/article backend shape verified by contract tests | `youtube-extension-dictionary-ui-refresh-evidence/slice-3-card-metadata/zware-card-metadata-dom.json` |
| New-card progress | `Learn`/`Known` click shows immediate feedback and refreshed state | planned |  |
| Review-card progress | `Again`/`Hard`/`Good`/`Easy` render only when backend actions allow them | planned |  |
| Examples preference | Expand/collapse-all applies globally for extension user | planned |  |
| Translation toggle | Compact icon shows and hides card translation | planned |  |
| Light/dark theme | Ribbon, dictionary, and floating toggle share theme | planned |  |

When a slice is not complete, record the reason in `Open defects / notes`
instead of marking it verified. If a defect is outside the extension UI, label
the owner explicitly: `AudioFilms projection`, `2000NL platform`, `service
worker`, or `visual/UI`.

## Open Questions For Grill

1. Resolved: clicked phrase context disappears from the ready dictionary body.
   It may remain behind a small context icon only as a quiet "why this lookup?"
   affordance for narrow layouts, scrolled panels, or diagnostics.
2. Resolved: source chip may stay visible as a small quiet rectangular chip, but
   the label comes from backend-provided `dictionary.name` and should already be
   concise, for example `VanDale`.
3. Resolved: progress labels remain backend-provided/current contract labels
   (`Learn`, `Known`, `Again`, `Hard`, `Good`, `Easy`) in this slice. No local
   translation/localization now.
4. Resolved: expand/collapse-all persistence is global for the extension user,
   not scoped to the current video/session.
5. Resolved: manual theme override applies to all AudioFilms extension surfaces,
   including the floating `AudioFilms On/Off` toggle, but not to YouTube.
