## Findings

**P0 — Connect secrets are still not truly service-worker-only.**

The access token is no longer returned to the content script, which fixes the main first-pass issue. However:

* The refresh token is stored in `chrome.storage.local` without restricting that storage area to trusted extension contexts: `audiofilms/extensions/youtube-shadowing/src/serviceWorker.js:275-315`.
* The content script obtains `baseUrl` and `clientId` from YouTube-origin `localStorage`: `content.js:1272-1276`.
* The worker accepts those values when refreshing or revoking the stored session: `serviceWorker.js:191-211,222-237`.
* The worker also accepts a caller-provided URL and always includes localhost in its bearer allowlist: `serviceWorker.js:112-133,342-359`; `content.js:1133-1149`.

Chrome documents that content scripts share host-page Web Storage and that `chrome.storage.local` is exposed to content scripts by default unless its access level is restricted. ([Chrome for Developers][1])

A page script could therefore change the Connect issuer and cause a stored refresh token to be sent to another server when the token refreshes or the user disconnects.

Required fix:

* Pin the 2000NL issuer and client ID inside service-worker/build configuration.
* Remove `baseUrl`, `clientId`, arbitrary URL, and authorization-header input from the content-to-worker message contract.
* Have the worker accept commands such as `{operation:"dict-lookup", body}` and construct exact AudioFilms URLs itself.
* Use release-specific origin allowlists; localhost should not be allowed in production builds.
* Call `chrome.storage.local.setAccessLevel({accessLevel:"TRUSTED_CONTEXTS"})`.
* Clear any stored session whose issuer or client ID does not match the pinned configuration.

---

**P0 — Guest lookup still uses an end-user identity rather than a public catalog identity.**

The current fallback remains `DICTIONARY_2000NL_ACCESS_TOKEN`, documented and configured as a user token:

* `audiofilms/app/src/lib/providers/dictionary/index.ts:141-146`
* `audiofilms/app/src/lib/providers/dictionary/README.md:18-30`
* `audiofilms/extensions/youtube-shadowing/README.md:334-337`

`includeUserState:false` suppresses progress fields, but it does not prove that dictionary visibility is public-only. Lookup still runs under that token’s user identity. The token may therefore see private dictionaries belonging to the fallback account, and it is also a short-lived credential unsuitable for a durable guest service.

2000NL should provide one of:

```http
POST /api/platform/v1/catalog/lookup
Authorization: Bearer <public-catalog service credential>
```

or an explicitly public endpoint that is hard-limited to system/public dictionaries and cannot read user state or invoke actions.

AudioFilms should refuse production startup if guest lookup is configured with a normal end-user token. The existing environment-token path can remain only as an explicit local-dogfood mode.

The first-pass write-identity issue is otherwise fixed: `/api/dict/actions` and `/api/dict/translation` now require forwarded bearer tokens at `actions/route.ts:32-39` and `translation/route.ts:23-29`.

---

**P1 — Lookup V2 has the right transport shape, but not yet the search semantics required for YouTube word clicks.**

2000NL now accepts `languageCode`, `contextText`, and `intent`, exposes normalized `entry.content`, and returns a fingerprint and match object. That is useful progress.

But runtime lookup still calls:

```ts
fetch_dictionary_entry_gated({ p_headword: query })
```

and merely echoes language and context: `2000nl/apps/ui/lib/platform/platformApi.ts:495-524`. Match evidence is currently only `exact` or `unknown`: `platformApi.ts:691-698`.

This creates two functional problems:

* Inflected Dutch words clicked in subtitles will frequently miss.
* Identical words across languages can return the wrong-language candidate.

Migration 064 already contains useful language and indexed-word-form search machinery in `search_word_entries_gated`: `2000nl/db/migrations/064_multilanguage_scope_rpcs.sql:569-579,612-641,682-739`. A dedicated external-click lookup RPC can reuse that work.

Before functional dictionary V2 starts, 2000NL should guarantee:

* language filtering;
* exact-headword matching;
* indexed inflection/form matching;
* best-first result ordering;
* truthful match evidence.

Define the match fields precisely:

```ts
match: {
  queriedForm: string;   // exact clicked token
  matchedForm?: string;  // actual indexed form that matched
  relation: 'exact' | 'inflection' | 'lemma' | 'fuzzy' | 'unknown';
}
```

Context-aware meaning ranking and fuzzy typo handling can be deferred. Do not claim that context was applied until it actually affects ranking.

AudioFilms V2 should use `POST /api/dict/lookup`. Its body should not expose `includeUserState` or `intent`; AudioFilms derives those:

```ts
{
  clickedForm: string;
  sourceLanguageCode: string;
  contextText?: string;
}
```

* Connected user: forwarded user token, `includeUserState:true`.
* Guest: public-catalog credential, `includeUserState:false`.
* Platform intent: always `external-click`.

The current AudioFilms provider still ignores language/context at the platform boundary and parses `entry.raw`: `TwoThousandNlDictionaryProvider.ts:76-82,112-123,170-213`. That must remain legacy V1 behavior, not the basis of V2.

---

**P1 — The dictionary card action contract still contains competing state machines.**

`cardCapabilitiesByType["word-to-definition"].phase` is the correct state source. However, 2000NL currently returns every card action and every review result for every phase: `platformApi.ts:379-408`. The tests preserve that behavior: `platformV1Routes.test.ts:179-196`.

At the same time, the proposed AudioFilms card still defines:

```ts
userState:
  | 'not-started'
  | 'known'
  | 'hidden'
  | 'reviewable'
  | 'suspended'
  | 'unknown'
```

at `youtube-extension-backend-ui-contracts.md:473`, even though later rules use `encountered`, `learning`, `reviewing`, `hidden`, and `frozen`.

That would force the AudioFilms backend or UI agent to invent phase transitions.

Use this canonical model instead:

```ts
progress: {
  phase:
    | 'not-started'
    | 'encountered'
    | 'learning'
    | 'reviewing'
    | 'hidden'
    | 'frozen';
  seenCount?: number;
  lastSeenAt?: string;
  frozenUntil?: string;
} | null;
```

2000NL should make `cardCapabilitiesByType.actions` state-aware:

* `not-started` or `encountered`: `start-learning`, `mark-known`;
* `learning` or `reviewing`: `review-card` with allowed results;
* `hidden` or `frozen`: no first-redesign progress actions.

`progressSummary` is aggregate across card types and must not drive the YouTube meaning-card row.

The canonical mappings remain:

* Learn → `start-learning`
* Known → `mark-known`
* Again → `review-card` + `fail`
* Hard → `review-card` + `hard`
* Good → `review-card` + `success`
* Easy → `review-card` + `easy`

`hidden` is the persisted platform state. `Known` is only a display label and action. Today `mark-known` is implemented as an `easy` review at `platformApi.ts:1131-1136`; after refresh, the card normally becomes `reviewing`, not `hidden`.

`displayActions` should be the only UI action source. Put raw platform capabilities under diagnostics or omit them from the extension response:

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
        turnIdRequired: boolean;
      }
    | { kind: 'card-translation' };
}>;
```

Require a client-generated `turnId` for `review-card`, `mark-known`, and `mark-unknown`, and reuse it across retries. The extension currently generates one only for `review-card`: `content.js:1018-1023`.

Plain word clicks and card rendering should remain read-only. Do not automatically call `record-view`. If passive YouTube analytics are later needed, add a separate event that explicitly does not change learning/scheduling state.

---

**P1 — Normalized dictionary content is sufficient for the compact card, but not yet for the full proposed card.**

`entry.content` can support headword, definition, examples, idioms, part of speech, and gender. That is enough for the first collapsed card.

It does not yet safely support:

* stable line-level translation placement;
* typed pronunciation or word forms;
* stable meaning/example/idiom identities;
* typed notes;
* reliable plural/diminutive projection without parsing `morphology`.

Add stable content nodes:

```ts
sections: Array<{
  id: string;
  sourcePath: string;
  kind: 'meaning' | 'example' | 'idiom' | 'form' | 'note';
  label?: string;
  text: string;
  translation?: string;
}>;
```

For V2, `entry.content`, `contentFingerprint`, and `match` should be required rather than optional.

Also resolve the shared-type/runtime nullability mismatch. `DictionaryEntryRef` declares non-null `dictionaryId` and `languageCode`, while runtime can return null and normalized content silently defaults language to Dutch: `platform.ts:44-54`; `platformApi.ts:298-303,652-656`. V2 should either guarantee those fields or model them as nullable—never silently infer `"nl"`.

Define `contentFingerprint` as a versioned fingerprint of canonical learner-visible content, excluding volatile diagnostics such as `sourceMeta`.

---

**P1 — Practice readiness is close, but source switching and operation completion are not revision-safe.**

The `baseState`/`displayState` split is correct. Remaining blockers are:

* no top-level `snapshotRevisionId`;
* no `availableTextSources[]`, so the UI cannot populate the Text Source selector;
* no source-selection request/response contract;
* timing jobs identify source IDs but not immutable input revisions;
* no result artifact references or typed operation error;
* the derivation table lists a failed source switch as `Rough`, while the rules correctly say a failed non-active source must not affect active readiness: `youtube-extension-backend-ui-contracts.md:193-210`.

Use one shared operation envelope for Get Captions, Improve Timing, and alignment:

```ts
type PracticeOperation = {
  id: string;
  kind: 'get-captions' | 'improve-timing' | 'align-text';
  state: 'queued' | 'running' | 'succeeded' | 'failed';
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

Add to `PracticeSnapshot`:

```ts
snapshotRevisionId: string;

availableTextSources: Array<{
  id: string;
  revisionId: string;
  contentFingerprint: string;
  languageCode: string;
  label: string;
  kind: 'provided-captions' | 'auto-captions' | 'asr';
  status: 'ready' | 'aligning' | 'failed';
  errorCode?: string;
}>;
```

Backend-owned readiness derivation should be:

1. No usable phrase set → `no-captions`.
2. Approximate timing or blocking quality flags → `rough`.
3. `word`, `aligned`, or explicitly accepted cue timing → `precise`.
4. Otherwise usable cue timing → `ready`.
5. A timing/alignment operation matching the active input revisions changes only `displayState` to `improving`.
6. A Get Captions operation remains `baseState/displayState = no-captions` and is represented through `activeOperation.kind = get-captions`.

Get Captions should be a new explicit operation endpoint wrapping the existing subtitle service:

```http
POST /api/practice/captions
```

Keep `GET /api/get-subs` as the automatic cached/read path.

Improve Timing should remain a product-level wrapper:

```http
POST /api/practice/timing-jobs
GET  /api/practice/operations/{operationId}
```

Do not expose `/api/asr/jobs` directly to the extension.

---

**P1 — Translation ownership is correct, but artifact identity and target resolution remain incomplete.**

The correct preference path is:

```text
2000NL user_settings
    -> GET /api/platform/v1/session
    -> GET /api/dict/session
    -> extension UI
```

Do not make Connect token metadata authoritative; the preference can change without token refresh.

AudioFilms should normalize guest and connected responses:

```ts
{
  authenticated: boolean;
  user: { id: string; email: string | null } | null;
  preferences: {
    translationTargetLanguageCode: string;
    source: 'user-setting' | 'platform-default';
    updatedAt: string | null;
  } | null;
}
```

For authenticated users, 2000NL should return a resolved, non-null target. For guests, translation should initially return `authentication_required` rather than silently defaulting to English.

2000NL tests now cover preference resolution and free-text translation, but the corresponding `/session` and `/text-translation` route implementations are absent from this review package. The behavior therefore cannot be verified from the handoff.

AudioFilms still requires `targetLang` and the extension still defaults it from local storage:

* `audiofilms/app/src/app/api/dict/translation/route.ts:13-21`
* `audiofilms/extensions/youtube-shadowing/src/content.js:1054-1070`

Remove that requirement. Normal card-translation requests should be:

```json
{ "entryId": "...", "force": false }
```

Phrase translation remains a separate operation. Recall and Shadow Show Translation should use the same artifact, with one semantic purpose such as `youtube-phrase-practice`, rather than separate cache policies for `youtube-recall` and `show-translation`.

The 2000NL generic translation response needs:

```ts
{
  translationId: string;
  status: 'ready' | 'pending' | 'failed';
  sourceTextHash: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  translatedText?: string;
  translationPolicyVersion: string;
  cached: boolean;
}
```

`provider` belongs in diagnostics, not the AudioFilms UI contract.

## Recommended target architecture

```text
YouTube content UI
  - renders PracticeSnapshot and DictionaryOverlayCardV2
  - sends commands/data only
  - never receives or constructs bearer tokens
          |
          v
Chrome service worker
  - trusted-only Connect token storage
  - pinned 2000NL issuer/client
  - refresh/revoke
  - constructs allowlisted AudioFilms requests
  - attaches Connect bearer
          |
          v
AudioFilms backend-for-frontend
  /api/dict/lookup
  /api/dict/session
  /api/dict/actions
  /api/dict/translation
    - chooses user versus public-catalog identity
    - projects normalized platform content
    - produces displayActions

  /api/practice/captions
  /api/practice/timing-jobs
  /api/practice/phrase-translations
    - media orchestration
    - readiness derivation
    - phrase/source/timing associations
          |
          v
2000NL Platform API
  - dictionary content and matching
  - progress and valid action transitions
  - translation target preference
  - card translation
  - generic text translation
  - canonical translation caches
```

This hybrid boundary should remain the product model. Direct extension-to-2000NL calls should not be an assumed future migration. Reconsider only if 2000NL eventually exposes the exact AudioFilms overlay contract and measurements show the proxy hop is a real problem.

## Cache ownership

AudioFilms should own:

* ASR artifact: `audioFingerprint + languageHint + segmentRange + modelVersion + asrConfigVersion`.
* Pairwise alignment: `timingEvidenceRevisionId + textSourceRevisionId + alignerVersion + normalizationVersion`.
* Phrase set: `textSourceRevisionId + timingEvidenceRevisionId + segmentationVersion`.
* Phrase association: `phraseSetRevisionId + phraseId -> translationId`.
* Public dictionary projection: `entryId + contentFingerprint + projectionVersion`.

2000NL should own:

* dictionary entries and search indexes;
* user progress, lists, encounter telemetry, and action semantics;
* translation target preference;
* dictionary-card translation cache;
* canonical phrase/text translation cache, keyed by source language, resolved target language, normalized text hash, context hash, and translation-policy version.

Authenticated dictionary responses and all session/action responses should be private/no-store. AudioFilms must not shared-cache user state or private entries.

## Work split

**AudioFilms**

* Harden the service-worker secret and request boundary.
* Implement `/api/dict/lookup` V2 using normalized content.
* Derive authentication mode and `includeUserState`; never accept them from the content script.
* Produce the only UI action model, `displayActions`.
* Add session proxy and remove the local translation-language default.
* Implement PracticeSnapshot, available source metadata, readiness derivation, and operation wrappers.
* Own ASR/alignment/phrase-set caches and phrase-to-translation linkage.
* Return typed `no_match`, `authentication_required`, `platform_unavailable`, and `rate_limited` errors.
* Do not silently substitute an LLM dictionary card in V2. Keep generated fallback in legacy `/api/dict`, or expose it later as a clearly separate non-platform explanation with no progress actions.

**2000NL**

* Provide a public-catalog/service-credential lookup boundary.
* Wire language filtering and exact inflection/form matching into platform lookup.
* Return truthful match evidence and stable normalized content nodes.
* Make card capabilities state-aware.
* Require/reliably deduplicate review-backed `turnId` values.
* Complete and expose session preference resolution.
* Complete generic text-translation artifact identity, cache, and policy versioning.
* Type card-translation overlays against stable content paths before line-level placement is promised.

**Defer**

* Direct extension calls to generic 2000NL platform endpoints.
* Context-semantic and fuzzy ranking after language and inflection matching work.
* Automatic YouTube encounter recording.
* Recall reverse-token lookup.
* Line-level card translation overlays.
* Hidden-card restore, list management, and dictionary copying.
* Cancellation and ETA until progress data is reliable.

## Handoff verdict and implementation order

The current documents are sufficient for static layout work, but not yet for independent functional UI and backend implementation. Agents would still invent source-selection behavior, action gating, translation artifact state, and operation completion rules.

Proceed in this order:

1. Fix Connect secret containment and the guest public-catalog identity.
2. Freeze versioned schemas and JSON fixtures for dictionary phases, readiness states, operations, session, errors, and translation.
3. Implement 2000NL language/form matching, state-aware capabilities, session preference, and translation artifact fields.
4. Implement AudioFilms V2 proxy/projection and practice operation wrappers.
5. Let the UI agent integrate against the frozen fixtures in parallel with steps 3–4.
6. Add functional phrase translation and Recall after the shared phrase artifact contract passes end-to-end tests.

[1]: https://developer.chrome.com/docs/extensions/reference/api/storage?utm_source=chatgpt.com "chrome.storage | API - Chrome for Developers"
