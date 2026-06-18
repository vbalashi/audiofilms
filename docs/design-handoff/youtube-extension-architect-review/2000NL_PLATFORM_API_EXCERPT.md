# 2000NL Platform API Excerpt For AudioFilms Review

This excerpt is package-specific. It highlights the 2000NL platform surfaces
relevant to the AudioFilms YouTube extension architecture review.

Use the actual 2000NL repository for full source truth. Do not treat older
request examples that ask for user state as AudioFilms implementation guidance:
the current AudioFilms `/api/dict` lookup path intentionally sends
`includeUserState: false` for both forwarded Bearer and env-token fallback.
State-aware dictionary cards are part of the proposed V2 contract.

## Existing Platform Surfaces

- `POST /api/platform/v1/lookup`
  - current request supports `query`, `includeUserState`, `languageCode`,
    `contextText`, and `intent`;
  - `languageCode`, `contextText`, and `intent` are accepted and echoed in
    response `request`, including no-result responses;
  - current lookup still resolves candidates through the existing headword RPC;
    language filtering, context-aware ranking, lemma, inflection, and fuzzy
    matching remain planned search-pipeline work;
  - response exposes normalized `entry.content` and `entry.contentFingerprint`;
    `entry.raw` remains compatibility/diagnostic payload, not the preferred
    external client contract;
  - when `includeUserState: true`, response includes user state fields,
    progress summary, list memberships, item-level legacy `availableActions`,
    and card-specific `cardCapabilitiesByType`.

- `POST /api/platform/v1/actions`
  - existing write endpoint for platform card actions;
  - AudioFilms write routes must forward a user Bearer token and must not use a
    shared environment token as write identity;
  - `cardCapabilitiesByType["word-to-definition"].actions` is the preferred
    card-specific capability source for dictionary cards and is limited to
    `record-view`, `start-learning`, `mark-known`, `mark-unknown`, and
    `review-card`;
  - legacy item-level `availableActions` may still include broader list and
    dictionary operations and should not drive the compact AudioFilms card
    action row.

- `POST /api/platform/v1/translation`
  - existing dictionary-card translation endpoint keyed by `entryId` and
    `targetLang`;
  - review question: allow target language to be omitted and resolved from
    2000NL user settings.

- Proposed `GET /api/platform/v1/session`
  - should expose sanitized user identity and preferences, especially
    `translationTargetLanguageCode`;
  - AudioFilms can proxy this as `GET /api/dict/session`.

- Proposed `POST /api/platform/v1/text-translation`
  - generic phrase/text translation authority for Recall and Shadow
    `Show Translation`;
  - 2000NL owns target preference, provider/prompt policy, and translation
    semantics;
  - AudioFilms owns YouTube phrase association and media cache linkage.

## Existing Files To Inspect In 2000NL

- `docs/reference/platform-api.md`
- `docs/reference/connect-api.md`
- `packages/shared/types/platform.ts`
- `apps/ui/lib/platform/platformApi.ts`
- `apps/ui/app/api/platform/v1/*`
- `apps/ui/tests/api/platformV1Routes.test.ts`
- `apps/ui/tests/api/platformActionsRoute.test.ts`
- `apps/ui/tests/api/platformTranslationRoute.test.ts`
- `db/migrations/004_user_features.sql`
- `db/migrations/064_multilanguage_scope_rpcs.sql`

## Known Drift To Review

- Runtime/platform docs expose `hidden` as a progress status, while one shared
  type has referred to `known`.
- `Known` should be treated as an AudioFilms display action label, not as a
  final persisted platform status unless 2000NL explicitly adopts it.
- Item-level `availableActions` remain technical platform capabilities, not
  polished UI action labels. AudioFilms should map these through its own
  `displayActions` projection.
- The candidate search semantics are intentionally conservative today:
  `relation: "exact"` means exact headword match; other relations are
  `unknown` until 2000NL exposes lemma/inflection/fuzzy evidence directly.
