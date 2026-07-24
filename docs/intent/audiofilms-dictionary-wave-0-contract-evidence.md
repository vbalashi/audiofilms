# AudioFilms Dictionary Wave 0 Contract And Evidence Package

Status: Wave 0 baseline; runtime unchanged
Captured: July 24, 2026
Scope: AudioFilms backend dictionary overlay and the YouTube extension only

This package records the existing consumer seam before the shared narrow
`SenseCard` anatomy is canonicalized in Track B3 of the cross-project plan. It
does not declare the current UI canonical, publish a new contract, or reopen
the already verified slices in
`docs/exec-plans/active/youtube-extension-dictionary-ui-refresh.md`.

The governing sources are:

- `docs/adr/0002-2000nl-dictionary-platform-boundary.md`;
- `docs/intent/youtube-extension-designer-brief.md`;
- `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`;
- `/Users/khrustal/dev/docs/intent/2000nl-audiofilms-dictionary-ux-architecture-plan-v2.md`.

## Baseline Revisions

These revisions locate the inspected trees; they are not yet approved fixture
pins:

| Repository | Inspected revision | Qualification |
| --- | --- | --- |
| AudioFilms | `2c565a391b7e368a783ddc876b3e50b84aadb5df` | Runtime files used by this inventory are tracked at this revision. The tree also contains unrelated untracked user files, so a commit hash alone must not be used as a fixture-content assertion. |
| 2000NL | `c21a073f11751c563408d0c1ae1e770ada2e96fe` | Observational upstream pointer only. The 2000NL tree has unrelated local changes and has not published an immutable Platform fixture package for AudioFilms. |

The current AudioFilms consumer names remain:

```text
HTTP response contract: dict-lookup-v2
AudioFilms card response: overlay-v2
```

They are AudioFilms versions, not aliases for a future 2000NL Platform V2.
Neither name should be reused for changed semantics or renamed merely to align
the two projects' version numbers.

## Existing Seam Map

```text
2000NL Platform lookup item
  -> AudioFilms /api/dict/lookup route
  -> pure backend overlay projection
  -> dict-lookup-v2 response containing overlay-v2 cards
  -> extension service-worker command boundary
  -> selected-word lookup state
  -> presentation render state
  -> overlay workflow
  -> DOM primitives and CSS
```

### 1. Platform input

| Responsibility | Path and symbol | Contract |
| --- | --- | --- |
| Choose authenticated or guest Platform operation | `app/src/app/api/dict/lookup/route.ts` — `resolveLookupMode` | Authenticated requests call Platform `lookup` with user state and translations. Catalog guests call `catalog/lookup` without progress actions; a local non-production dogfood fallback may call `lookup` without user state, translations, or progress actions. |
| Build Platform request | same file — `platformLookupRequest` | Sends `query`, `languageCode`, optional `contextText`; authenticated mode also sends `includeUserState`, `includeTranslations`, and `intent: "external-click"`. |
| Execute and parse Platform call | same file — `fetchPlatformLookup`, `parsePlatformJson` | Consumes the current Platform lookup response. AudioFilms types the consumed subset locally as `PlatformLookupResponse` / `PlatformLookupItem`. |
| Retry without inline translations | same file — `POST` fallback branch | Any authenticated 5xx from a translation-enabled lookup may retry the same lookup with `includeTranslations: false`; the fallback reason is projected into AudioFilms metadata. |

The local `PlatformLookupItem` consumed by the V2 route lives in
`app/src/lib/dictionary/overlayProjection.ts`. Its relevant inputs are:

- `entry.id`, language, headword, POS, gender/raw article evidence;
- normalized `entry.content` and `contentFingerprint`;
- dictionary metadata;
- clicked/matched-form relationship;
- `cardCapabilitiesByType["word-to-definition"]`;
- `userStateByCardType["word-to-definition"]`.

`app/src/lib/providers/dictionary/TwoThousandNlDictionaryProvider.ts` is a
separate legacy `/api/dict` provider path. It still projects `entry.raw` into
the older `DictionaryOverlayCard` shape. It is not the backend seam used by the
extension's `POST /api/dict/lookup` `overlay-v2` flow and must not be mistaken
for the place to refine the narrow SenseCard.

### 2. AudioFilms backend overlay projection

| Responsibility | Path and symbol | Ownership |
| --- | --- | --- |
| Response envelope | `app/src/lib/dictionary/overlayProjection.ts` — `projectDictionaryLookupV2Response` | Creates `dict-lookup-v2`, reports `meta.responseVersion = "overlay-v2"`, and preserves a legacy flat `result` summary for compatibility. |
| One Platform item to one overlay card | same file — `projectOverlayCard` | Selects AudioFilms display semantics while preserving `entryId`, `word-to-definition`, Platform capabilities/action IDs, content fingerprint, section IDs/source paths, and match relation. |
| Section compatibility normalization | same file — `normalizedSections`, `normalizedSection`, `normalizedMeaning` | Prefers normalized `content.sections`, falls back to `content.meanings`, then flat definition. This is a compatibility adapter, not a new source-of-truth content model. |
| Progress action projection | same file — `displayActionsForCapabilities` | Converts Platform capability/action/result IDs into AudioFilms display commands. Guest mode suppresses progress actions. |
| Public TypeScript contract | `app/src/types/dictionary.ts` — `DictionaryOverlayCardV2`, `DictionaryLookupV2Response` | Compile-time contract for `dict-lookup-v2` and `overlay-v2`. |
| HTTP exposure | `app/src/app/api/dict/lookup/route.ts` — `POST` | Returns the projection unchanged except for HTTP status and operational headers. |

This layer owns:

- compatibility with the presently consumed Platform lookup shape;
- learner-facing field selection for AudioFilms;
- concise dictionary display name, article, chips, summary and sections;
- AudioFilms display actions that retain Platform mutation IDs.

It does not own:

- card expansion or translation visibility;
- menu-open, pending, feedback, focus, or responsive disclosure state;
- dictionary identity, meaning semantics, progress transitions, or source
  identity.

### 3. Extension transport and selected-word state

| Responsibility | Path and symbol | Behavior |
| --- | --- | --- |
| Privileged backend routing | `extensions/youtube-shadowing/src/serviceWorker.js` — `fetchDictionaryCommand`, `dictionaryCommand` | Maps `dict-lookup` to `POST /api/dict/lookup`, attaches a fresh 2000NL Connect bearer only inside the trusted service worker, and optionally serves extension-owned dev mocks. |
| Content-to-worker transport | `extensions/youtube-shadowing/src/dictionaryCommandTransport.js` — `fetchDictionaryResult` | Sends clicked form/language/context, accepts no-match as a typed result, and passes the response payload through without parsing Platform raw content. |
| Lookup lifecycle | `extensions/youtube-shadowing/src/dictionaryLookupWorkflow.js` — `selectLookupWord`, `lookupSelectedWord` | Freezes source binding at click, resets per-card view state, fetches the response, and transitions the selected word to ready/error. |
| Selected-word state transitions | `extensions/youtube-shadowing/src/dictionaryState.js` — `initialSelectedWord`, `lookupReady`, `lookupError` | Owns lookup status/result/error plus generated and grouped-search substate. It does not reinterpret overlay cards. |
| Translation reveal/fetch | `dictionaryLookupWorkflow.js` — `toggleCardTranslation`, `requestDictionaryCardTranslation` | Keeps reveal and pending state local; uses translated lookup fields first and calls the translation command only as fallback. |

The extension stores the following presentation state separately from the
backend card:

- `examplesExpanded` and `exampleExpansionOverrides`;
- `visibleTranslationsByCardId`;
- `translationPendingByCardId`;
- `cardActionFeedbackByCardId`;
- `cardMenuOpenId` and menu feedback;
- audio pending state;
- selected word lookup/loading/error state.

Global examples expansion and theme preferences are persisted by the display
preference modules. Per-card translation reveal/pending, menu, and action
feedback are session/view state and are reset for a new word lookup. Audio
pending is also session/view state, but it is cleared when its own operation
finishes rather than by `selectLookupWord`.

### 4. Presentation model and DOM

| Responsibility | Path and symbol | Behavior |
| --- | --- | --- |
| Pure presentation decisions | `extensions/youtube-shadowing/src/dictionaryPresentation.js` — `overlayCardRenderState` | Combines one overlay card with local state into chips, translation visibility, header-action states, definition lines, encounter chips, and feedback flags. |
| Disclosure policy | same file — `collapsedOverlaySections`, `overlaySectionTranslation`, `reviewActionStates` | Chooses collapsed details, translation placement/fallback, and display-action button states. |
| Card workflow | `extensions/youtube-shadowing/src/dictionaryOverlayWorkflow.js` — `renderOverlayCard`, `renderOverlaySections`, `performDisplayAction` | Connects render state to DOM operations and routes commands to translation, Platform action, or generated-save workflows. |
| Workflow composition | `extensions/youtube-shadowing/src/dictionaryRenderWorkflow.js` and `dictionaryContentWorkflow.js` | Supplies scoped dependencies and routes ready, fallback, selected-span, and account states. |
| Panel state selection | `extensions/youtube-shadowing/src/dictionaryPanelWorkflow.js` and `dictionarySearchWorkflow.js` | Chooses selected-word/selected-span body and ensures a ready `cards[]` body begins with rendered cards. |
| DOM primitives | `extensions/youtube-shadowing/src/dictionaryDom.js` — `renderOverlayCard`, `renderOverlaySections`, `renderReviewActions` | Creates `.af-overlay-card`, title/article/chips, translated lines, details controls, personal chips, and action rows. |
| Visual styling | `extensions/youtube-shadowing/src/shadow.css` | Owns extension-local density, typography, states, theme, and responsive card appearance. |

This is already the intended deep seam:

```text
overlay card + local view state
  -> dictionaryPresentation render state
  -> dictionaryOverlayWorkflow
  -> dictionaryDom + shadow.css
```

The first visual convergence slice should deepen these boundaries. It should
not add a second renderer or another pass-through wrapper.

## Consumer Fixture Inventory

### Compile-time/backend fixtures

`app/src/types/fixtures/youtubeExtensionContracts.ts` currently contains:

| Fixture | State represented | Notable coverage |
| --- | --- | --- |
| `guestLookupFixture` | successful guest lookup | `dict-lookup-v2`, `overlay-v2`, no progress object, translation-only action |
| `connectedLearningLookupFixture` | connected learning card | learning progress, four review grades, translated sections |
| `connectedReviewingLookupFixture` | connected review card | reviewing phase |
| `noMatchLookupFixture` | typed empty result | 404-compatible no-match envelope |
| `hiddenFrozenNoActionsCardsFixture` | non-actionable personal states | hidden and frozen phases with no progress commands |

The file also contains non-dictionary extension fixtures; those are outside
this package.

The current SHA-256 of the complete fixture source is:

```text
7d48a7ab931b2bc5216005e511d2d87c243e71c496253a9eab0ac43500865ca2
```

This is an observational checksum, not an approved immutable release. The
fixture objects share a `baseCard`, so a source-file hash is necessary; object
names alone are insufficient to identify their exact payload.

Backend characterization currently lives in:

- `app/tests/dictionary/overlayProjection.test.ts`;
- `app/tests/dictionary/lookupRoute.test.ts`.

It covers exact/inflection matching, article/POS/source projection, audio,
meaning-number display metadata, no-match, generated-draft action capability,
nullable Platform fields, section source paths, inline translations, progress
action phases, guest suppression, hidden/frozen behavior, and authenticated
translation fallback.

### Extension-owned UI mocks

`extensions/youtube-shadowing/src/dictionaryMocks.js` supplies two service
worker mock modes:

| Mode/path | State represented |
| --- | --- |
| `cards` / `dict-lookup` | three cards: encountered/start-learning, reviewing/four grades, and frozen/no progress commands |
| `cards` / `dict-translation` | ready card-level fallback translation plus a forced error for `entry-translate-error` |
| `cards` / `dict-action` | successful action response used before refreshed lookup |
| `generated` / `dict-lookup` | typed `dict-lookup-v2` no-match response |
| `generated` / draft/save operations | generated draft card and explicit save/start-learning path |

Its current SHA-256 is:

```text
43721ba96a507a0320c890e84c9f06390bf71bf89d3d51731d838aa026ed0244
```

Known fixture drift:

- the normal `cards` mock result does not currently echo
  `contractVersion: "dict-lookup-v2"` or
  `meta.responseVersion: "overlay-v2"`; its metadata uses
  `version: "dictionary-card-ui-smoke"`;
- mock `displayActions` contain an extra `enabled` field not present in the
  TypeScript `DictionaryOverlayCardV2` type;
- mock review commands use `requiresTurnId`, while the TypeScript contract uses
  `turnIdRequired`;
- historic evidence and product prose say `Learn`, while the current backend
  type/projection and current mock say `Start Learning`.

The extension renderer tolerates these differences because it consumes the
fields it needs. They must be resolved when fixtures are formally locked; B3
must not use the permissiveness as evidence of one precise consumer contract.
Resolving them can be an AudioFilms fixture/contract cleanup without changing
the Platform contract, but it is not part of this documentation-only slice.

## DOM And Screenshot Evidence Inventory

The existing evidence package is
`docs/exec-plans/active/youtube-extension-dictionary-ui-refresh-evidence/`.

| Slice | Recorded state | Evidence |
| --- | --- | --- |
| 0 | pre-refresh `opbouwen` and ten-card `zware` baselines | two DOM JSON snapshots and two full screenshots |
| 1 | clicked-form/card-count header and account popover | two DOM snapshots and screenshot |
| 2 | ready body begins with `.af-overlay-card` | DOM snapshot and screenshot |
| 3 | headword title, POS/article/source metadata | `zware` DOM snapshot, screenshot, and backend projection test note |
| 4 | global/per-card examples disclosure and persistence | expanded DOM snapshot and screenshot |
| 5 | translation visible after show/hide/show | translated DOM snapshot and screenshot |
| 6 | encountered/review action feedback | mock DOM snapshot and screenshot |
| 7 | light and dark themes | two DOM/style snapshots and two screenshots |

What the package proves well:

- ready lookup hierarchy and card-first body;
- clicked form versus card headword separation;
- current chip filtering and article placement policy;
- collapsed/expanded example behavior;
- per-card translation reveal behavior;
- encountered and reviewing action groups plus success feedback;
- theme/state attributes and key DOM class names.

Evidence limitations:

1. Slice 3 explicitly combines current remote UI behavior with a local
   projection contract test. Its screenshot did not prove that the deployed
   backend already supplied concise source names and explicit article metadata.
2. The PNG files for Slices 4, 5, 6, and both Slice 7 themes are byte-identical
   (`fcbf9a81...a79ac9b`). Their DOM snapshots remain useful, but these files
   cannot serve as independent visual references for those five named states.
3. The package does not contain a stable raw `dict-lookup-v2` payload captured
   from the service-worker path. Existing DOM snapshots therefore characterize
   rendering, not an immutable backend/consumer fixture pair.
4. Evidence dates from June 22, 2026 and is not bound to an AudioFilms commit,
   upstream Platform revision, mock checksum, viewport, browser version, and
   B3 anatomy revision in one manifest.

## State Coverage Required For The Canonical Narrow SenseCard

### Covered or substantially characterized

| State/content | Current proof |
| --- | --- |
| ready, multiple cards | `opbouwen`, `zware`, Slices 0–3 |
| collapsed and expanded examples | Slice 4 DOM plus preference behavior |
| translation ready and visible/hidden | Slice 5 DOM; compile-time translated lookup fixture |
| encountered/new action family | mock `cards`, Slice 6 |
| learning/reviewing action family | compile-time fixtures and mock `cards`, Slice 6 |
| action success feedback | Slice 6 |
| hidden/frozen without progress commands | compile-time fixture and controlled mock assertions in the validation matrix |
| generated no-match/draft | `generated` mock mode and validation-matrix behavior |
| light/dark theme state | Slice 7 DOM/style snapshots |

### Missing before a canonical matched reference suite

| Missing state/content | Required proof |
| --- | --- |
| exact guest SenseCard | pinned guest payload, DOM, and screenshot with no progress row and a clear connect policy |
| lookup loading and lookup error | DOM assertions, focus behavior, retry behavior, narrow screenshot |
| empty/no-match before and during generated fallback | separate guest and connected states |
| translation pending and failed | per-card DOM, accessible label, stable layout, retry |
| action pending and failed | button/focus stability, error feedback, no duplicate command |
| hidden and frozen visual references | individual pinned DOM/screenshot states, not only type/mock assertions |
| idiom, note, long definition, multiple examples | overflow/disclosure references at canonical narrow width |
| missing article/POS/source/audio/translation | sparse-content fixture proving graceful omission |
| duplicate-looking senses | two cards with different `entryId` and meaning metadata so DOM identity is not derived from text |
| keyboard, focus return, Escape, and screen-reader names | interaction assertions for expand, translate, menu, retry, and progress actions |
| narrow/mobile-like viewport and scroll containment | exact B3 viewport reference and YouTube-context smoke |
| canonical B3 visual target | anatomy revision, token revision, reference image hash, and element-to-field map |

Line-level translation should not be declared canonical while the fallback
translation adapter can still map legacy overlay arrays by order in
`dictionaryPresentation.js`. The current inline `sections[].translation` path
is suitable when stable section IDs/source paths are supplied; the legacy
fallback remains compatibility behavior.

## Fixture Version And Pinning Policy

### Ownership

- 2000NL owns Platform schema and producer fixtures.
- AudioFilms owns the `dict-lookup-v2` response schema, `overlay-v2`
  projection fixtures, extension presentation fixtures, DOM snapshots, and
  visual references.
- The B3 design owner owns the canonical anatomy/token/reference revision.
- A local relative path into the other repository is never a released
  dependency.

### Required pin record

Before C2 presentation work starts, add one tracked AudioFilms manifest for
the chosen suite. Each immutable release record must include:

```yaml
fixtureSetId: audiofilms-dictionary-overlay-v2/<immutable revision>
platform:
  contractVersion: <explicit Platform version>
  producerRepository: 2000nl
  producerRevision: <full immutable git SHA or published artifact revision>
  schemaSha256: <hash>
  fixtureArtifactSha256: <hash>
audiofilms:
  repositoryRevision: <full git SHA>
  lookupContractVersion: dict-lookup-v2
  overlayResponseVersion: overlay-v2
  projectionSourceSha256: <hash>
  typesSourceSha256: <hash>
  backendFixtureSha256: <hash>
  extensionFixtureSha256: <hash>
design:
  anatomyRevision: <B3 revision>
  tokenRevision: <B3 revision>
  referenceStateId: <approved narrow SenseCard state>
  referenceImageSha256: <hash>
evidence:
  viewport: <width>x<height>@<device scale factor>
  browser: <name and version>
  domSnapshotSha256: <hash>
  capturedAt: <UTC timestamp>
```

Rules:

1. Full hashes are mandatory; branch names, `main`, `latest`, dates, and a
   developer working tree are not pins.
2. Vendored consumer fixtures are exact copies or explicit AudioFilms
   projections of an immutable upstream fixture. Record both upstream and
   projected hashes.
3. A fixture change creates a new `fixtureSetId`. Do not edit a released record
   in place.
4. `dict-lookup-v2` and `overlay-v2` stay unchanged while their consumer
   semantics remain backward compatible. If AudioFilms changes required fields
   or their meaning, introduce an AudioFilms contract/version change; do not
   hide it behind a new upstream hash.
5. A new Platform revision alone does not force an AudioFilms overlay bump.
   The pinned projection suite determines compatibility.
6. B3 reference changes create a new design pin even when data contracts stay
   unchanged.
7. DOM and screenshot evidence is valid only for the exact fixture, design
   revision, viewport, browser, and AudioFilms revision in the manifest.
8. Generated timestamps, bearer tokens, user email, and other volatile/private
   fields must be normalized or omitted before hashing fixtures.

Current useful observational hashes, to be replaced by the approved manifest:

```text
types:
c3f2ff9ae4fbeee2cec47acbc6eb270f721cb7832ffae75b768d2003345cbbab

backend projection:
a886adf4f11ca1cee9ef42c7259987f047fd5ede1a57c79a2a1e6014a21259a5

backend fixture source:
7d48a7ab931b2bc5216005e511d2d87c243e71c496253a9eab0ac43500865ca2

extension fixture source:
43721ba96a507a0320c890e84c9f06390bf71bf89d3d51731d838aa026ed0244
```

These hashes make drift visible now; they do not satisfy the upstream or B3
pin requirements.

## Safe First Implementation Slice After B3

Name: `C2.1 — one pinned narrow SenseCard, presentation only`

### Go conditions

- B3 has assigned an anatomy revision, token revision, exact narrow viewport,
  and one approved flagship state.
- The approved state maps every visible element to an existing
  `DictionaryOverlayCardV2` field or explicit extension-local view state.
- The pin manifest contains an immutable Platform producer fixture and the
  matching AudioFilms `overlay-v2` projection.
- Fixture drift listed above is resolved or explicitly normalized in the
  manifest.
- A fresh baseline DOM snapshot and screenshot exist for the same fixture and
  viewport.

### Change boundary

The slice may change:

- `extensions/youtube-shadowing/src/dictionaryPresentation.js`;
- `extensions/youtube-shadowing/src/dictionaryDom.js`;
- `extensions/youtube-shadowing/src/shadow.css`;
- focused presentation/DOM fixtures and tests;
- the pinned reference/evidence manifest.

It may use the existing
`dictionaryOverlayWorkflow.renderOverlayCard` orchestration without replacing
it.

The slice must not change:

- 2000NL code, schema, actions, or Platform response;
- `DictionaryOverlayCardV2` required semantics;
- `dict-lookup-v2` or `overlay-v2`;
- `app/src/lib/dictionary/overlayProjection.ts`;
- `/api/dict/lookup`, action, translation, or session routes;
- service-worker auth/command routing;
- source binding, generated-entry lifecycle, or action payload identity.

If the B3 design needs data absent from the pinned overlay card, stop and open
a separately versioned backend/contract slice. Do not infer article, progress,
action availability, translation targets, source identity, or sense identity
in the renderer.

### Intended implementation

1. Add a deterministic presentation test that feeds the pinned `overlay-v2`
   flagship card plus explicit local state into the current presentation/DOM
   seam.
2. Align hierarchy, density, disclosure controls, spacing, and tokens with the
   B3 narrow reference using the existing renderer.
3. Preserve semantic DOM/action wiring and the current local state owners.
4. Produce matched DOM and screenshot evidence from the exact pinned fixture.
5. Run a real-profile Chrome smoke only after deterministic contract/DOM
   checks pass.

### Acceptance

- The exact pinned card renders the B3 hierarchy at the canonical narrow
  viewport.
- Card identity remains `entryId`; the clicked form stays panel context and is
  not repeated as sense identity.
- Article, POS, source, meaning number, sections, translations, progress, and
  actions render only from their existing semantic fields.
- Collapsed/expanded and translation hidden/visible states do not change the
  card's identity, action payload, or ordering.
- The action labels/commands submitted are those in `displayActions`; the UI
  does not derive phase actions.
- Guest/hidden/frozen states render no unauthorized progress row.
- Long content wraps and scrolls inside the extension without moving the
  underlying YouTube page.
- Keyboard focus remains visible and stable after expand, translation, menu,
  and progress interactions.
- The pre-existing fixture suite remains green and no response JSON changes.
- The evidence manifest hashes the exact DOM and screenshot used for review.

### Validation

Deterministic checks:

- AudioFilms dictionary projection and lookup-route tests;
- the focused presentation/DOM fixture test for collapsed, expanded,
  translated, and relevant progress state;
- static syntax checks for touched no-build extension modules;
- manifest/checksum verification;
- `git diff --check`.

Visual and integration checks:

- pixel or perceptual comparison against the B3 reference at its exact
  viewport;
- focused dictionary UI and behavior smoke in the user's real Chrome profile;
- source-binding smoke if action DOM/wiring was touched;
- one real guest lookup and one connected lookup to prove the mock did not hide
  auth/state differences.

The current duplicated post-Slice-3 PNGs must be recaptured rather than carried
forward as the matched B3 reference suite.

## Wave 0 Result

AudioFilms does not need a renderer rewrite or a Platform contract change to
make the first visible narrow-card improvement. It already has a usable
backend projection seam and a separate extension presentation seam.

The blockers before implementation are artifact-level:

- no approved B3 anatomy/reference revision;
- no immutable upstream producer fixture pin;
- minor drift between TypeScript fixtures and extension mocks;
- incomplete/duplicated screenshot evidence for several presentation states.

Once those are resolved, C2.1 is independently deployable and reversible
inside the extension presentation layer.
