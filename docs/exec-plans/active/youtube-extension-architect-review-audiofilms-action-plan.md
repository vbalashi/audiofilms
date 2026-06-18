# AudioFilms Architect Review Action Plan

Date: 2026-06-18

Source reviews:

- `docs/design-handoff/youtube-extension-architect-review/review01.md`
- `docs/design-handoff/youtube-extension-architect-review/review02.md`

This is the AudioFilms-side action plan for rechecking and fixing both architect
reviews. Run the 2000NL-side plan in parallel from the 2000NL repository.

## Goal

Make AudioFilms a safe backend-for-frontend for the YouTube extension:

- the content script never sees or constructs 2000NL bearer tokens;
- AudioFilms derives auth mode, platform intent, and user-state inclusion;
- AudioFilms exposes stable V2 dictionary/practice/session/translation contracts
  for the extension UI;
- legacy `/api/dict` behavior remains isolated from the new V2 overlay path.

## Inputs To Read First

- `docs/design-handoff/youtube-extension-architect-review/review01.md`
- `docs/design-handoff/youtube-extension-architect-review/review02.md`
- `docs/design-handoff/youtube-extension-architect-review/ARCHITECT_PROMPT.md`
- `docs/exec-plans/active/youtube-extension-backend-ui-contracts.md`
- `docs/adr/0002-2000nl-dictionary-platform-boundary.md`
- `docs/intent/youtube-extension-designer-brief.md`
- `docs/intent/youtube-extension-agent-runbook.md`
- `extensions/youtube-shadowing/src/serviceWorker.js`
- `extensions/youtube-shadowing/src/content.js`
- `app/src/app/api/dict/route.ts`
- `app/src/app/api/dict/actions/route.ts`
- `app/src/app/api/dict/translation/route.ts`
- `app/src/lib/providers/dictionary/index.ts`
- `app/src/lib/providers/dictionary/TwoThousandNlDictionaryProvider.ts`
- `app/src/lib/twoThousandNlPlatform.ts`

## P0: Secret Boundary And Connect Issuer

Status from review history:

- First-pass issue "access token returned to content script" should already be
  fixed. Recheck it, do not assume.
- Second-pass issue remains open: content script can still influence issuer,
  client ID, request URL, and localhost bearer allowlist behavior.

Actions:

- Verify the content script never receives `accessToken` or `refreshToken`.
- Call `chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })`
  from the service worker when available.
- Pin the 2000NL issuer/base URL and Connect client ID inside trusted extension
  configuration, not YouTube page `localStorage`.
- Remove `baseUrl`, `clientId`, arbitrary target URL, and authorization-header
  input from content-to-worker messages.
- Change the worker contract to command-style messages, for example
  `{ operation: "dict-lookup", body }`, and have the worker construct exact
  AudioFilms URLs itself.
- Use release-specific allowlists. `localhost` and `127.0.0.1` are acceptable
  only in explicit local/dev builds.
- On startup/session read, clear stored sessions whose issuer or client ID does
  not match pinned configuration.

Acceptance checks:

- No `accessToken` string is included in content-script-visible responses.
- No content script message can make the worker refresh/revoke against an
  arbitrary Connect issuer.
- No content script message can make the worker attach a bearer token to an
  arbitrary URL.
- Production configuration does not include localhost bearer targets.

## P0: Guest Lookup Identity

Status from review history:

- Write routes are expected to be fail-closed now.
- Guest lookup remains architecturally unsafe if `DICTIONARY_2000NL_ACCESS_TOKEN`
  is a normal end-user token.

Actions:

- Keep `/api/dict/actions` and authenticated `/api/dict/translation` fail-closed:
  they must require a forwarded 2000NL user bearer and never use env fallback.
- Keep authenticated responses `Cache-Control: private, no-store`.
- Split guest lookup identity from user identity:
  - production guest lookup must use a future public-catalog/service credential
    from 2000NL, or no guest 2000NL lookup at all;
  - normal end-user Supabase tokens must be rejected for production guest lookup;
  - existing env token may remain only behind an explicit local dogfood flag.
- Update docs/env examples so `DICTIONARY_2000NL_ACCESS_TOKEN` is not presented
  as a production user-token fallback.

Acceptance checks:

- Missing bearer on mutation routes returns 401.
- Production startup/config validation refuses an end-user guest lookup token or
  clearly disables guest 2000NL lookup until 2000NL exposes public catalog auth.
- Docs state that guest lookup cannot run under a shared end-user identity.

## P1: Dictionary Lookup V2 Proxy

Required target:

```http
POST /api/dict/lookup
```

Content-script/body contract:

```ts
{
  clickedForm: string;
  sourceLanguageCode: string;
  contextText?: string;
}
```

AudioFilms-derived platform behavior:

- connected user: forwarded bearer, `includeUserState: true`;
- guest: public-catalog credential when available, `includeUserState: false`;
- platform intent: always `external-click`;
- do not accept `includeUserState` or `intent` from the content script.

Actions:

- Add or update V2 endpoint separately from legacy `GET /api/dict`.
- Use normalized 2000NL `entry.content`, `contentFingerprint`, and `match`.
- Treat `entry.raw` as diagnostics/legacy only.
- Echo `clickedForm`; use 2000NL `headword`; render `clickedForm -> headword`
  only when they differ.
- Add explicit `contractVersion`.
- Return typed errors such as `no_match`, `authentication_required`,
  `platform_unavailable`, and `rate_limited`.
- Do not silently substitute an LLM/generated dictionary card in V2. Keep that
  fallback in legacy `/api/dict`, or expose it later as a clearly separate
  explanation with no progress actions.

Acceptance checks:

- Context is sent in JSON body, not query string.
- V2 code path does not parse `raw.meanings` for primary UI content.
- V2 response shape is fixture-backed and does not mix V1/V2 card shapes.

## P1: Display Actions And Progress Phase Projection

Canonical progress model:

```ts
progress: {
  phase:
    | "not-started"
    | "encountered"
    | "learning"
    | "reviewing"
    | "hidden"
    | "frozen";
  seenCount?: number;
  lastSeenAt?: string;
  frozenUntil?: string;
} | null;
```

Canonical UI mappings:

- `Learn` -> `start-learning`
- `Known` -> `mark-known`
- `Again` -> `review-card` + `fail`
- `Hard` -> `review-card` + `hard`
- `Good` -> `review-card` + `success`
- `Easy` -> `review-card` + `easy`
- `Translate` -> card translation, not a platform action

Actions:

- Make `displayActions` the only UI action source.
- Put raw platform capabilities under diagnostics or omit them from extension
  responses.
- Use 2000NL `cardCapabilitiesByType["word-to-definition"]`, not aggregate
  `progressSummary`, to build the compact card action row.
- Remove stale AudioFilms states such as `known`, `reviewable`, `suspended`, and
  `unknown` from the V2 contract.
- Generate and reuse a client `turnId` for `review-card`, `mark-known`, and
  `mark-unknown`; do not limit this to `review-card`.
- Keep word clicks/card rendering read-only. Do not automatically call
  `record-view`.

Acceptance checks:

- Not-started/encountered cards show only `Learn` and `Known`.
- Learning/reviewing cards show only `Again`, `Hard`, `Good`, `Easy`.
- Hidden/frozen cards show no first-redesign progress row.
- `Translate` is visually and contractually separate from progress actions.

## P1: Session And Translation

Required preference path:

```text
2000NL user_settings
  -> GET /api/platform/v1/session
  -> GET /api/dict/session
  -> extension UI
```

AudioFilms normalized session response:

```ts
{
  authenticated: boolean;
  user: { id: string; email: string | null } | null;
  preferences: {
    translationTargetLanguageCode: string;
    source: "user-setting" | "platform-default";
    updatedAt: string | null;
  } | null;
}
```

Actions:

- Add `GET /api/dict/session` as a sanitized proxy to 2000NL session metadata.
- Remove normal-use dependency on extension local storage
  `afShadowingTranslationLang`.
- Do not treat Connect token metadata as authoritative for preference values.
- Change card translation so normal requests can omit `targetLang`:
  `{ entryId: "...", force?: false }`.
- For guests, return `authentication_required` for translation instead of
  silently defaulting to English.
- Keep dictionary-card translation separate from phrase translation.

Phrase translation target:

```http
POST /api/practice/phrase-translations
GET  /api/practice/phrase-translations/{translationId}
```

Actions:

- Use 2000NL generic text translation as authority.
- AudioFilms owns YouTube phrase association and cache linkage.
- Use one semantic purpose such as `youtube-phrase-practice` for both Recall
  and Shadow Show Translation.
- Keep provider names in diagnostics, not the UI contract.

## P1: Practice Snapshot And Operations

Required snapshot additions:

```ts
snapshotRevisionId: string;

availableTextSources: Array<{
  id: string;
  revisionId: string;
  contentFingerprint: string;
  languageCode: string;
  label: string;
  kind: "provided-captions" | "auto-captions" | "asr";
  status: "ready" | "aligning" | "failed";
  errorCode?: string;
}>;
```

Shared operation envelope:

```ts
type PracticeOperation = {
  id: string;
  kind: "get-captions" | "improve-timing" | "align-text";
  state: "queued" | "running" | "succeeded" | "failed";
  videoId: string;
  input: {
    snapshotRevisionId: string;
    textSourceRevisionId?: string;
    timingEvidenceRevisionId?: string;
  };
  progress?: number;
  pollUrl?: string;
  retryAfterMs?: number;
  result?: {
    snapshotRevisionId: string;
    textSourceRevisionId?: string;
    timingEvidenceRevisionId?: string;
    phraseSetRevisionId?: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};
```

Actions:

- Add deterministic backend-owned readiness derivation:
  - no usable phrase set -> `no-captions`;
  - approximate timing or blocking flags -> `rough`;
  - word/aligned/accepted cue timing -> `precise`;
  - otherwise usable cue timing -> `ready`;
  - matching active timing/alignment job changes only `displayState` to
    `improving`;
  - Get Captions remains `baseState/displayState = no-captions` while represented
    by `activeOperation.kind = "get-captions"`.
- Add source-selection request/response contract.
- Ensure failed non-active source switches do not degrade active readiness.
- Add `POST /api/practice/captions` wrapping the existing subtitle service.
- Keep `GET /api/get-subs` as cached/read path.
- Add product-level timing wrappers:
  - `POST /api/practice/timing-jobs`
  - `GET /api/practice/operations/{operationId}`
- Do not expose `/api/asr/jobs` directly to the extension.

## Fixtures And Validation

Before UI implementation continues, freeze representative JSON fixtures for:

- dictionary no-match;
- dictionary not-started/encountered;
- dictionary learning/reviewing;
- dictionary hidden/frozen;
- session guest/authenticated;
- card translation ready/authentication-required;
- phrase translation pending/ready/failed;
- practice no-captions/rough/ready/precise/improving;
- operation queued/running/succeeded/failed.

Run the narrow checks for touched files:

```bash
cd app
npm run lint
npm run build
```

If global lint/build is blocked by known unrelated issues, run focused checks
and document the blocker:

```bash
cd app
npx eslint src/lib/twoThousandNlPlatform.ts src/app/api/dict/route.ts src/app/api/dict/actions/route.ts src/app/api/dict/translation/route.ts
node --check ../extensions/youtube-shadowing/src/serviceWorker.js
node --check ../extensions/youtube-shadowing/src/content.js
```

## Defer

- Direct extension calls to 2000NL platform endpoints.
- Recall translated-token reverse lookup.
- Automatic YouTube encounter recording.
- Add-to-list, copy-to-dictionary, hidden-card restore.
- Line-level card translation overlays.
- Job cancellation and ETA until progress data is reliable.
