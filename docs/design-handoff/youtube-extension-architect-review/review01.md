## Findings

**P0 — 2000NL write identity is not fail-closed.**

`POST /api/dict/actions` does not itself reject a missing user bearer token; it delegates token resolution to `getBearerToken()` and the platform helper. At the same time, the repository still documents `DICTIONARY_2000NL_ACCESS_TOKEN` as an end-user Supabase-token fallback. If that fallback can reach write routes, an unauthenticated request could mutate the fallback user's progress. The helper implementation was not included in the review package, so this cannot be ruled out. See `audiofilms/app/src/app/api/dict/actions/route.ts:20-52` and `audiofilms/extensions/youtube-shadowing/README.md:152-160`.

Make these hard invariants:

* `/api/dict/actions` requires a forwarded Connect access token. No environment-token fallback.
* `/api/dict/translation` requires a user token for private entries or user-preference resolution.
* Guest lookup uses either a separately scoped read-only service credential or a public 2000NL catalog endpoint with `includeUserState:false`. It must never use a shared end-user token.
* Authenticated dictionary/session responses use `Cache-Control: private, no-store`.

The access token should also remain inside the extension service worker. It is currently returned to the content script and used there to construct the authorization header (`serviceWorker.js:316-324`, `content.js:1147-1164`). The worker should instead attach the token to allowlisted AudioFilms requests and return only account metadata to the content script.

---

**P1 — The proposed dictionary card is the correct kind of AudioFilms projection, but several of its fields cannot be produced reliably from the current 2000NL contract.**

The extension should not move closer to `entry.raw`. That would reverse ADR-0002. In fact, the platform boundary should become less raw:

* 2000NL already defines a normalized `DictionaryEntryEnvelope`, but platform lookup exposes `entry.raw` as `unknown`.
* AudioFilms currently assumes one raw schema with `raw.meanings`, `plural`, `diminutive`, and similar fields.
* Platform lookup accepts only `query` and `includeUserState`; it does not accept language or context.
* AudioFilms receives `sourceLanguage` and phrase context but sends neither to 2000NL.

See `2000nl/packages/shared/types/platform.ts:56-82, 214-236`, `2000nl/apps/ui/lib/platform/platformApi.ts:359-370`, and `audiofilms/app/src/lib/providers/dictionary/TwoThousandNlDictionaryProvider.ts:46-61, 100-123, 170-213`.

2000NL should add, backward-compatibly:

```ts
type PlatformLookupRequestV2 = {
  query: string;
  languageCode?: string;
  contextText?: string;
  includeUserState?: boolean;
  intent?: 'external-click';
};

type PlatformLookupItemV2 = {
  entry: {
    id: string;
    content: DictionaryEntryEnvelope;
    contentFingerprint: string;
    // Existing identifiers and raw may remain for diagnostics.
  };
  match: {
    queriedForm: string;
    matchedForm?: string;
    relation: 'exact' | 'inflection' | 'lemma' | 'fuzzy' | 'unknown';
  };
  // Existing dictionary and state fields...
};
```

AudioFilms should echo the exact `clickedForm`, use the returned `headword`, and show `clickedForm → headword` when they differ. Do not require a separate `lemma` field until 2000NL can state that it is genuinely a lemma.

The current GET lookup also places phrase context in the URL (`content.js:1100-1105`). V2 should be `POST /api/dict/lookup` with a JSON body so context is not placed in logs, caches, and URL-length-sensitive infrastructure.

---

**P1 — Current 2000NL action availability is not state-aware enough to drive the redesigned card.**

The platform currently returns `record-view`, `start-learning`, `mark-known`, `mark-unknown`, and `review-card` for every result regardless of the card's state. `progressSummary` is also entry-wide across all card types, while the YouTube overlay specifically acts on `word-to-definition`. See `platformApi.ts:466-524` and the snapshot at `platformV1Routes.test.ts:143-242`.

Therefore, neither `availableActions` nor aggregate `progressSummary.status` can safely decide between:

* `Learn` / `Known`
* `Again` / `Hard` / `Good` / `Easy`

2000NL should expose card-specific capabilities:

```ts
cardCapabilitiesByType: {
  'word-to-definition': {
    phase:
      | 'not-started'
      | 'encountered'
      | 'learning'
      | 'reviewing'
      | 'hidden'
      | 'frozen';
    actions: LookupActionId[];
    reviewResults: Array<'fail' | 'hard' | 'success' | 'easy'>;
    frozenUntil?: string | null;
  };
}
```

`hidden` is the canonical platform status. Runtime and platform documentation agree on `hidden`; the shared type's `known` value is stale and should be corrected. See `platform-api.md:96`, `platformApi.ts:229-273`, and `platform.ts:172-182`.

`Known` remains an action label, not a persisted status. Under the current runtime, `mark-known` is implemented as an `easy` review, so the refreshed card ordinarily becomes `reviewing`, not `hidden` (`platformApi.ts:954-959`, `platformActionsRoute.test.ts:140-163`). AudioFilms must not translate `hidden` into `known` in its data model. If product intent is for `Known` to remove a card from study, that behavior must be changed in 2000NL rather than simulated in AudioFilms.

The separation between `platformActions` and `displayActions` is directionally correct, but two independent arrays can contradict each other. Make `displayActions` the sole UI source and embed the exact command:

```ts
displayActions: Array<{
  id: 'learn' | 'known' | 'again' | 'hard' | 'good' | 'easy' | 'translate';
  label: string;
  group: 'progress' | 'translation';
  command:
    | {
        kind: 'platform-action';
        action: 'start-learning' | 'mark-known' | 'review-card';
        result?: 'fail' | 'hard' | 'success' | 'easy';
      }
    | { kind: 'card-translation' };
}>;
```

Raw platform capabilities can remain in diagnostics. `translate` must not appear as a platform action: it is a separate endpoint and is not a `LookupActionId`. The candidate V2 currently conflates those concepts at `youtube-extension-backend-ui-contracts.md:379-388`.

The canonical mapping is:

* `Learn` → `start-learning`
* `Known` → `mark-known`
* `Again` → `review-card` + `fail`
* `Hard` → `review-card` + `hard`
* `Good` → `review-card` + `success`
* `Easy` → `review-card` + `easy`

For the first redesign, use `Learn/Known` for `not-started` and `encountered`, the four grades for `learning` and `reviewing`, and no progress row for `hidden` or `frozen`. A restore action can be designed later.

---

**P1 — Translation authority and target-language acquisition are currently contradictory.**

The 2000NL database already owns `user_settings.translation_lang`, but Connect returns only user identity and token metadata, and no reviewed Platform API endpoint exposes the preference. The extension consequently reads `afShadowingTranslationLang` from local storage and defaults to English. See `004_user_features.sql:20-35`, `connect-api.md:80-94`, and `content.js:1050-1066`.

Add:

```http
GET /api/platform/v1/session
```

```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  },
  "preferences": {
    "translationTargetLanguageCode": "en",
    "updatedAt": "..."
  }
}
```

AudioFilms should proxy a sanitized version as:

```http
GET /api/dict/session
```

Connect token responses may include the value as a convenience hint, but they should not be authoritative because the preference can change without a token refresh.

Also allow `targetLang` to be omitted from 2000NL card-translation requests. 2000NL should resolve the current preference and always return the resolved target language. AudioFilms should not require the extension to supply it during normal use.

There is also a source-of-truth contradiction for phrase translation. The current AudioFilms plan says AudioFilms chooses the translation provider (`youtube-extension-backend-ui-contracts.md:258-265`), while the stated architecture decision says 2000NL is the translation authority. Resolve this by adding a distinct 2000NL text-translation operation:

```http
POST /api/platform/v1/text-translation
```

It should accept arbitrary phrase text, source language, optional target language, purpose, and optional context. 2000NL owns target preference, provider/prompt policy, and translation semantics. AudioFilms owns the media-specific association between that translation and a YouTube phrase.

Existing `/api/platform/v1/translation` remains entry-based dictionary-card translation. It must not be reused for Recall phrases.

---

**P1 — Practice Readiness is not yet a deterministic state machine.**

The current proposal conflates content quality with background activity:

* `Improving...` replaces the quality state, losing whether current practice is Rough, Ready, or Precise.
* `primaryAction` permits one action, while Rough can require either or both Get Captions and Improve Timing.
* A failed source switch is listed as a reason for Rough, although the UI contract says the previous working source remains active. A failure on a non-active source must not degrade the active source's readiness.
* “Good enough manual phrase boundaries” is not a machine-testable Precise rule.

See `youtube-extension-backend-ui-contracts.md:147-167` and `youtube-extension-designer-brief.md:515-527`.

Use a stable practice snapshot:

```ts
type PracticeSnapshot = {
  videoId: string;
  textSource: {
    id: string;
    revisionId: string;
    languageCode: string;
    label: string;
    kind: 'provided-captions' | 'auto-captions' | 'asr';
  } | null;
  timingEvidence: {
    id: string;
    revisionId: string;
    quality: 'approximate' | 'cue' | 'word' | 'aligned' | 'accepted-cue';
  } | null;
  phraseSet: {
    id: string;
    revisionId: string;
    phrases: PracticePhrase[];
  } | null;
  readiness: {
    baseState: 'no-captions' | 'rough' | 'ready' | 'precise';
    displayState:
      | 'no-captions'
      | 'rough'
      | 'ready'
      | 'precise'
      | 'improving';
    availableActions: Array<'get-captions' | 'improve-timing'>;
    recommendedAction?: 'get-captions' | 'improve-timing';
    activeOperation?: {
      id: string;
      kind: 'get-captions' | 'improve-timing' | 'align-text';
      state: 'queued' | 'running';
      progress?: number; // 0..1
    };
    diagnosticFlags?: string[];
  };
};
```

Derivation should be backend-owned and ordered:

1. No usable phrase set → `no-captions`.
2. Active artifact has approximate timing or an active blocking quality flag → `rough`.
3. Selected timing evidence is word-level, aligned, or explicitly accepted cue timing → `precise`.
4. Otherwise → `ready`.
5. A relevant timing/alignment job changes only `displayState` to `improving`; `baseState` remains available.

A Get Captions operation should appear as `activeOperation.kind='get-captions'`, not as `Improving...`.

---

**P2 — Mutation idempotency, encounter semantics, and translation-line identity need small contract fixes.**

Plain lookup and card rendering should remain read-only. Do not automatically call `record-view`. It changes 2000NL card telemetry and can move a card from `new` to `seen`; that is progress state, not harmless analytics. If passive YouTube click analytics are wanted later, create a separate non-learning event contract.

For explicit review actions, require a client-generated `turnId` and reuse it across retries. The platform supports it, but the extension currently does not send one. This prevents double reviews after retries or double clicks.

For encounter display, return `lastSeenAt`, not `lastSeenLabel`; the UI should format relative time.

For card translation overlays, every projected section needs a stable `id` or `sourcePath`. The existing platform translation response types `overlay` as `unknown`, so line-level definition/example/idiom placement is not currently a safe promise. Block-level translation can ship first; precise line overlays should wait for a typed 2000NL overlay contract.

## Recommended target architecture

The hybrid model is coherent and should remain the product architecture.

```text
YouTube content UI
        |
        | commands and JSON payloads; no tokens
        v
Chrome service worker
  - owns Connect access/refresh tokens
  - refreshes tokens
  - signs allowlisted AudioFilms requests
        |
        | Authorization: Bearer <2000NL access token>
        v
AudioFilms backend-for-frontend
  /api/dict/*
    - validates requests
    - projects 2000NL content into overlay cards
    - maps platform capabilities to display actions
    - never stores or refreshes the user token

  /api/practice/*
    - caption retrieval orchestration
    - ASR/timing/alignment orchestration
    - practice phrase projection
    - readiness derivation
    - media-specific caches and phrase associations
        |
        v
2000NL Platform API
  - session/preferences
  - normalized dictionary content and match semantics
  - progress and card-specific capabilities
  - actions and idempotency
  - card translation
  - generic text-translation authority
```

Do not plan a later direct extension-to-platform migration. Direct calls would make the extension coordinate two public APIs, recreate AudioFilms projection logic, duplicate error/state handling, and expose raw platform evolution to the UI. Revisit only if 2000NL eventually provides the exact AudioFilms overlay contract or measurements show the proxy is a material latency or availability problem.

## Endpoint choices

Keep `GET /api/get-subs` as the cached/read path for initial loading. Do not hide user-initiated retrieval behind `GET ...?refresh=1`.

Add:

```http
POST /api/practice/captions
```

This should internally reuse the existing subtitle service. It may return immediately with `state:"ready"` and a `PracticeSnapshot`, or return `queued/running` with an operation ID and polling information.

Use a higher-level wrapper for timing:

```http
POST /api/practice/timing-jobs
GET  /api/practice/timing-jobs/{jobId}
```

Do not expose `/api/asr/jobs` directly to the extension. Improve Timing may ultimately use cached ASR, fresh ASR, forced alignment, word timing, or a cheaper pairwise alignment. ASR is an implementation detail.

Add:

```http
POST /api/practice/phrase-translations
GET  /api/practice/phrase-translations/{translationId}
```

The request identifies `phraseSetId`, `phraseId`, source text/revision, and optional context. AudioFilms calls the 2000NL text-translation authority and associates the result with the phrase artifact.

For dictionary V2:

```http
POST /api/dict/lookup
GET  /api/dict/session
POST /api/dict/actions
POST /api/dict/translation
```

Keep the current `/api/dict` response for legacy consumers, but do not mix optional V1 and V2 card shapes in the same `cards[]`. Give V2 an explicit `contractVersion`.

## Cache ownership and keys

AudioFilms should own these media caches:

* ASR artifact: `mediaFingerprint + audioTrackFingerprint + sourceLanguageCode + asrEngineVersion + asrConfigVersion`.
* Pairwise alignment: `timingArtifactId + textSourceRevisionId + alignmentAlgorithmVersion + normalizationVersion`.
* Practice phrase set: `textSourceRevisionId + timingEvidenceRevisionId + segmentationVersion`.
* Phrase translation: `sourceLanguageCode + targetLanguageCode + normalizedSourceTextHash + optionalContextHash + translationPolicyVersion`.
* Phrase association: `phraseSetRevisionId + phraseId → translationArtifactId`.

`videoId` and `phraseId` are useful associations but should not be the only semantic translation key. Phrase IDs change when segmentation changes.

2000NL must remain the owner of:

* dictionary entries and normalized source content;
* user card state, progress, lists, and encounter telemetry;
* action semantics and idempotency;
* translation target preference;
* dictionary-card translation cache;
* generic translation provider/prompt policy.

AudioFilms should not persist authenticated 2000NL lookup responses as a whole. They contain user state and potentially private dictionary entries. Public dictionary projection caching can be added only after 2000NL exposes a stable `contentFingerprint` and a non-user service-auth model.

## Work split

**AudioFilms**

* Make token handling service-worker-only and fail closed on write routes.
* Implement `/api/dict/lookup` V2 and the shallow overlay projection.
* Make `displayActions` the only UI action source.
* Add `PracticeSnapshot`, source/timing/phrase revision IDs, and deterministic readiness derivation.
* Implement Get Captions and Improve Timing operation wrappers over existing services.
* Own ASR, alignment, phrase-set, and phrase-association caches.
* Implement the redesigned extension against fixtures before backend completion.

**2000NL**

* Fix `known` versus `hidden` in shared types and add tests for hidden state.
* Return normalized `entry.content` plus a content fingerprint.
* Accept `languageCode`, context, and external-click intent in lookup.
* Return card-specific phases, actions, and allowed review results.
* Expose `/api/platform/v1/session` with translation preference.
* Allow card translation to resolve the user's target language server-side.
* Add the generic text-translation endpoint if 2000NL remains the declared translation authority.
* Provide a proper read-only service/client credential model if guest lookup is required.

**Defer**

* Direct extension calls to 2000NL platform routes.
* Recall translated-token reverse lookup.
* Automatic YouTube encounter recording.
* Add-to-list, copy-to-dictionary, and hidden-card restore actions.
* Precise translation overlays for every example and idiom.
* Job cancellation and ETA until progress data is reliable.

## Handoff and implementation order

The current documents are sufficient for static visual grouping, but not for independent functional UI and backend implementation. Agents would still invent action state, readiness precedence, target-language behavior, and job state locally.

The next order should be:

1. Enforce the auth invariants, especially no fallback identity on writes and no access token in the content script.
2. Update 2000NL types and contract tests for session metadata, normalized content, `hidden`, and card-specific capabilities.
3. Commit AudioFilms V2 TypeScript contracts plus representative JSON fixtures for dictionary, practice readiness, jobs, and translation.
4. Implement AudioFilms lookup/session stubs and practice operation wrappers while the UI agent builds Shadow, source/readiness, and dictionary surfaces against those fixtures.
5. Implement phrase translation and functional Recall; add reverse lookup only afterward.

The supplied archive did not contain the implementations of `/api/get-subs`, `/api/asr/jobs`, or AudioFilms’ 2000NL platform helper, so their existing internal behavior could not be verified. The recommendations above define the external contracts those implementations should satisfy.
