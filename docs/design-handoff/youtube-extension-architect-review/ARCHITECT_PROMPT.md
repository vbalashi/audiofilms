# AudioFilms + 2000NL Architect Review Prompt

Date: 2026-06-18

You are reviewing two related codebases together:

- `audiofilms/`: YouTube phrase-practice app and Chrome extension.
- `2000nl/`: dictionary, progress, platform actions, translation, and Connect/API authority.

The goal is not a general code review. The goal is to review the architecture and contracts needed to make the AudioFilms YouTube extension work cleanly with 2000NL while supporting the intended redesigned UI.

## Primary Review Outcome

Please produce a short architecture recommendation covering:

1. The API/backend contract between the YouTube extension, AudioFilms backend, and 2000NL.
2. Which work should happen in AudioFilms, which work should happen in 2000NL, and which work should be deferred.
3. Whether the current proposed contracts are coherent enough for separate UI and backend agents to implement.
4. Any contradictions, risky assumptions, or missing fields that would block implementation.

Lead with findings. Use severity labels such as P0/P1/P2/P3. Include file references when possible.

## Current Source Of Truth

Use these AudioFilms docs first:

- `audiofilms/docs/intent/youtube-extension-designer-brief.md`
- `audiofilms/docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`
- `audiofilms/CONTEXT.md`
- `audiofilms/ARCHITECTURE.md`
- `audiofilms/docs/intent/subtitle-practice-contract.md`
- `audiofilms/docs/exec-plans/active/2000nl-platform-dictionary-integration.md`
- `audiofilms/docs/adr/0002-2000nl-dictionary-platform-boundary.md`

Use these 2000NL references for platform truth:

- `audiofilms/docs/design-handoff/youtube-extension-architect-review/2000NL_PLATFORM_API_EXCERPT.md`
- `2000nl/docs/reference/connect-api.md`
- `2000nl/packages/shared/types/platform.ts`
- `2000nl/apps/ui/lib/platform/platformApi.ts`
- `2000nl/apps/ui/app/api/platform/v1/*`
- `2000nl/apps/ui/tests/api/platform*.test.ts`
- `2000nl/db/migrations/004_user_features.sql`
- `2000nl/db/migrations/064_multilanguage_scope_rpcs.sql`

The package includes a focused 2000NL Platform API excerpt rather than treating
older full-reference request examples as AudioFilms implementation guidance.
Current AudioFilms `/api/dict` lookup intentionally sends
`includeUserState: false`; state-aware dictionary cards belong to the proposed
V2 contract.

Recent 2000NL alignment pass: platform lookup now accepts and echoes
`languageCode`, `contextText`, and `intent`, including no-result responses;
normalized `entry.content` and `contentFingerprint` are exposed; and
`cardCapabilitiesByType["word-to-definition"].actions` is limited to card
actions. The remaining 2000NL search-pipeline work is real lemma/inflection/fuzzy
matching and language/context-aware ranking.

Older AudioFilms active plans are historical/operational context only when they conflict with the current designer brief or backend/UI contract.

## Decisions Already Made

Do not reopen these unless you find strong evidence that they are structurally wrong:

- The current UI source of truth is the designer brief plus backend/UI contracts.
- User-facing labels should not expose `manual`, `exact`, `timedtext`, `yt-dlp`, `provider`, or `backend provider`; those belong in diagnostics/history/debug.
- Text Source labels are human-facing, for example `Dutch captions`, `Dutch auto-captions`, and `ASR transcript`.
- Practice Readiness labels are `No captions`, `Rough`, `Ready`, `Precise`, and `Improving...`.
- `Get Captions` and `Improve Timing` are separate user-initiated actions.
- Practice modes are `Shadow` and `Recall` for the first redesign.
- `Show Original` is sticky only for Shadow. Recall hides the original on phrase entry and reveals it transiently.
- `Show Translation` in Shadow shows the whole current phrase translation inline, not in the dictionary panel.
- 2000NL is the source of truth for dictionary, progress/action semantics, translation authority, and translation target preference.
- The extension may own a 2000NL Connect session/token because it runs in the browser, but lookup/actions/translation still go through AudioFilms `/api/dict*`; AudioFilms proxies/orchestrates 2000NL platform APIs.
- Polished UI labels are `Learn`, `Known`, `Again`, `Hard`, `Good`, `Easy`, and `Translate`.
- 2000NL payload/action values remain technical, for example `start-learning`, `mark-known`, `review-card`, `fail`, `hard`, `success`, and `easy`.

## Questions To Answer

## Critical Invariants And Recent Findings

Treat these as high-priority review points:

- Write identity must be fail-closed. AudioFilms `/api/dict/actions` and
  authenticated `/api/dict/translation` must require a forwarded 2000NL Connect
  Bearer token and must never mutate state through
  `DICTIONARY_2000NL_ACCESS_TOKEN`.
- The 2000NL Connect access token should remain in the Chrome extension service
  worker. The content script should receive account metadata only; the service
  worker attaches the token to allowlisted AudioFilms `/api/dict*` requests.
- Guest dictionary lookup needs a separate read-only service credential or a
  public 2000NL catalog endpoint with `includeUserState:false`. A shared
  end-user token must not be used as guest identity.
- 2000NL should expose normalized dictionary content and match semantics instead
  of forcing AudioFilms to parse `entry.raw`. The normalized content shape now
  exists; please review whether the projection is sufficient and what matching
  semantics still need to be added.
- AudioFilms dictionary V2 should use `POST /api/dict/lookup` with a JSON body,
  not URL query parameters for phrase context.
- 2000NL item-level `availableActions` are technical/platform capabilities, not
  a polished UI action model. AudioFilms should expose `displayActions` with
  embedded commands for UI rendering and should prefer card-specific
  `cardCapabilitiesByType` over the legacy broad action list.
- 2000NL owns target translation preference and translation semantics. Phrase
  translation should use a 2000NL generic text-translation authority, while
  AudioFilms owns YouTube phrase association and cache linkage.
- Practice readiness should be a deterministic snapshot with `baseState`,
  `displayState`, available actions, and active operation metadata.

### A. AudioFilms / 2000NL Boundary

- Is the chosen hybrid boundary coherent: extension owns Connect session/token storage, but calls AudioFilms backend for lookup/actions/translation?
- Should this remain the product model, or should the browser extension eventually call 2000NL platform APIs directly?
- What should AudioFilms cache, and what must remain 2000NL-owned?

### B. Dictionary Card Contract

- Is `DictionaryOverlayCardV2` the right shape for an AudioFilms projection, or should it stay closer to 2000NL raw platform payloads?
- Is the separation between `platformActions` and `displayActions` sufficient?
- What is the correct canonical mapping for `Learn`, `Known`, `Again`, `Hard`, `Good`, and `Easy`?
- How should AudioFilms project 2000NL progress status drift, especially `hidden` vs `known`?
- Should YouTube word clicks or card views create `seen`/encounter events, or should only explicit Learn/Known/review actions mutate progress?

### C. Translation

- How should AudioFilms obtain the learner's 2000NL translation target language?
- Should 2000NL expose this in Platform API/session metadata, or should AudioFilms request it through another endpoint?
- How should phrase-level translation for Recall/Show Translation relate to existing 2000NL card-level translation?

### D. Captions / Timing / ASR

- Should `Get Captions` wrap existing `/api/get-subs`, or become a new operation endpoint?
- Should `Improve Timing` use `/api/asr/jobs` directly, or a higher-level practice-timing wrapper?
- What cache keys should be used for ASR artifacts, pairwise alignment, and phrase translation?
- Is the `Practice Readiness` derivation table coherent enough for UI implementation?

### E. Handoff Readiness

- Can UI and backend agents implement from the current docs without inventing local state machines?
- Which missing fields should be stubbed first?
- Which decisions must be resolved before UI redesign starts, and which can be deferred behind stable placeholders?

## Expected Output

Please return:

1. Findings first, ordered by severity.
2. A recommended target architecture diagram or concise data-flow summary.
3. Concrete contract changes: field names, endpoint choices, and state mappings.
4. A split of work between AudioFilms and 2000NL.
5. A short implementation order for the next agents.
