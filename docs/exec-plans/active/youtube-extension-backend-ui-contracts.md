# YouTube Extension Backend/UI Contracts

Status: active planning note, June 18, 2026. Shared V2 contract types and
representative fixtures are frozen in `app/src/types/` for the first backend/UI
contract slice; endpoint behavior is unchanged.

This plan turns the designer brief into backend/API work that can be reviewed by
an architect and then split between UI and backend agents. It is about contracts,
not visual styling.

## Architect Attention

Most product/UI vocabulary is now decided. The architect should focus only on
the contract boundaries that still change implementation shape:

- whether `Get Captions` is a wrapped `/api/get-subs` refresh path or a new
  explicit captions operation;
- whether `Improve Timing` is the existing `/api/asr/jobs` job contract or a
  higher-level practice-timing wrapper;
- cache keys for ASR artifacts, pairwise alignments, and Phrase Translation;
- how AudioFilms obtains the 2000NL translation target language;
- how dictionary card V2 fields map from 2000NL/platform data into an
  extension-friendly shape;
- which encounter/action-log events YouTube lookup should create.
- fail-closed write identity: authenticated writes must never fall back to a
  shared environment user token;
- whether 2000NL adds normalized lookup V2, session/preferences, and generic
  text translation endpoints needed by the extension contracts.

Do not revisit these already-decided UI terms unless new implementation evidence
breaks them: `Shadow`, `Recall`, `Show Original`, `Show Translation`, `Text
Source`, `Timing Evidence`, `Practice Readiness`, `Get Captions`, and `Improve
Timing`.

## Why This Exists

The YouTube extension UI now depends on product states that the current backend
does not fully expose:

- practice readiness: `No captions`, `Rough`, `Ready`, `Precise`,
  `Improving...`;
- user-initiated `Get Captions`;
- user-initiated `Improve Timing`;
- pairwise alignment between a text source and timing evidence;
- Recall Mode phrase translation;
- Shadow Mode `Show Translation` for whole-phrase comprehension;
- Recall Mode reverse lookup from translated prompt words to original-language
  dictionary candidates;
- 2000NL-owned translation target language;
- state-aware dictionary card actions;
- dictionary card anatomy: clicked form, lemma/headword, compact chips,
  expandable rich sections, translation overlays, and minimal personal encounter
  signals;
- encounter/action logging semantics for YouTube word clicks, card views, and
  later review surfaces.

Without explicit contracts, a UI agent will invent local state and a backend
agent will expose fields that do not match the intended interaction model.

## Canonical Product Terms

Use `CONTEXT.md` as the glossary. The important terms for this work are:

- `Text Source`: the learner-visible text source, such as `Dutch captions`,
  `Dutch auto-captions`, or `ASR transcript`.
- `Timing Evidence`: the timing layer used for phrase boundaries.
- `Practice Readiness`: the small learner-facing status/action signal.
- `Get Captions`: user-initiated backend retrieval for usable subtitle text.
- `Improve Timing`: user-initiated ASR/alignment work for phrase boundaries.
- `Practice Mode`: `Shadow` or `Recall`.
- `Show Original`: sticky original-text visibility for Shadow Mode.
- `Phrase Translation`: whole-phrase translation used as Recall prompt and as
  Shadow Mode comprehension aid.
- `Show Translation`: action that reveals Phrase Translation inline in Shadow
  Mode without switching to Recall.
- `Clicked Form`: exact word form clicked in the phrase.
- `Lemma`: dictionary base form/headword for the clicked form.
- `Personal Encounter Signal`: quiet seen/last-seen style card metadata.

Avoid these as default learner-facing labels:

- `manual`;
- `exact`;
- `timedtext`;
- `yt-dlp`;
- `provider`;
- `backend provider`;
- `Auto Reveal`;
- `Listen Mode`.

Those words may still appear in diagnostics, historical validation notes, or
debug payloads.

## Current Contract Baseline

This is the working contract baseline for the next architect pass. Rows marked
`existing` should be preserved where possible. Rows marked `proposed` need the
architect to confirm endpoint shape before UI/backend agents implement against
them.

| Area | Status | Endpoint / owner | UI behavior | Architect decision still needed |
| --- | --- | --- | --- | --- |
| Initial subtitle read | existing | `GET /api/get-subs` plus direct browser caption attempts | Load cheap/browser-visible captions automatically; do not show provider names by default. | Confirm which metadata fields are stable enough to drive `Text Source` and diagnostics. |
| `Get Captions` | first slice implemented | `POST /api/practice/captions`, backed by existing subtitle service/cache. | User-initiated; does not start ASR; applies returned captions automatically if still on the same video. | First slice returns a synchronous `state: "ready"` envelope with a minimal `PracticeSnapshot`; queued/polling remains deferred. |
| `Improve Timing` | first slice implemented | `POST /api/practice/timing-jobs`, `GET /api/practice/operations/{operationId}`, and `GET /api/practice/timing-jobs/{jobId}`. | User-initiated; existing practice remains usable; `displayState` can become `improving` while base quality remains visible. | Progress/ETA and pairwise alignment cache key remain deferred. |
| Text Source switch | first slice implemented | `POST /api/practice/source-selection`, backed by active/cached subtitle source metadata. | Keep previous working source if selected source fails; pairwise alignment may run in background later. | First slice validates active source/revision only; multi-source inventory and alignment cache key remain deferred. |
| Phrase Translation | proposed | AudioFilms `POST /api/practice/phrase-translations` calls 2000NL generic text-translation authority and associates the result to a phrase artifact. | Recall uses it as prompt; Shadow `Show Translation` renders it inline for current phrase. | Confirm 2000NL `POST /api/platform/v1/text-translation`, cache key, prefetch policy, and missing-translation behavior. |
| Translation target | proposed | 2000NL `GET /api/platform/v1/session` exposed through AudioFilms `GET /api/dict/session`. | Extension uses 2000NL target language; local override is dogfood-only fallback. | Confirm preference field name and unauthenticated fallback. |
| Dictionary lookup V2 | proposed | `POST /api/dict/lookup` backed by 2000NL lookup V2 request/body. | UI sends clicked form, language, and phrase context without URL query leakage. | Confirm normalized 2000NL content, match relation, and content fingerprint. |
| Dictionary card V2 | proposed | Explicit V2 card contract with `displayActions.command`; raw platform capabilities stay diagnostic. | UI renders clicked form, headword, chips, sections, state-aware actions, quiet encounter signals. | Confirm typed fields and action/result mapping from 2000NL. |
| Encounter logging | proposed | 2000NL/action-log boundary through AudioFilms. | Learn/Known/review are explicit mutations; passive card rendering should not silently become review. | Decide whether click/card-view creates a `seen` encounter and how it affects `Seen`/`Last`. |
| Write identity | required | `/api/dict/actions` and authenticated `/api/dict/translation` require a forwarded 2000NL Connect Bearer token. | Guest lookup can be read-only; progress/translation writes are fail-closed. | Confirm service credential model for guest public catalog lookup, if needed. |
| Guest lookup deploy readiness | implemented | `GET /api/health` exposes `providers.dictionary.guestLookup`. | Deployer verifies guest lookup separately from forwarded-Bearer user lookup. | Production-ready guest lookup requires `status: "available"`, `productionReady: true`, and `mode: "catalog-token"` from `DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN`; local dogfood fallback reports `status: "degraded"` and is never production-ready. |

## Phase 0: Architecture Contract Review

Do this before separate UI/backend implementation.

Deliverable:

- one short contract proposal that says which fields each endpoint must expose,
  which fields are already present, and which are new.

Architect questions:

- Should `/api/get-subs` stay the read endpoint while `Get Captions` becomes a
  separate explicit refresh/retrieval action, or should it become a new
  operation endpoint?
- Should `Improve Timing` use the existing `/api/asr/jobs` endpoint shape or a
  new higher-level practice-timing endpoint?
- How are ASR transcription artifacts keyed and cached?
- How are pairwise alignments keyed and cached: video only, text source only, or
  video + text source + timing evidence?
- Where does Recall phrase translation live, and how is it cached?
- How does the API expose phrase-translation availability/loading/error state
  for both Recall Mode and Shadow Mode `Show Translation`?
- How does backend expose the 2000NL translation target language?
- How does backend expose dictionary card state so the extension can choose
  Learn/Known vs Again/Hard/Good/Easy?
- How does backend expose dictionary card anatomy without making the extension
  parse raw 2000NL payloads?
- What encounter/action-log events should YouTube lookup create?

Exit criteria:

- UI and backend can work from the same field names and state machine.
- Any intentionally deferred field has a clear placeholder/fallback.

Slice 1 status:

- Exported contracts now live in `app/src/types/api.ts`,
  `app/src/types/dictionary.ts`, and `app/src/types/practice.ts`.
- Existing route/adaptor code type-checks against the exported V2 dictionary
  lookup, dict session, practice snapshot, operation, captions, and phrase
  translation shapes where practical.
- Representative compile-time fixtures live in
  `app/src/types/fixtures/youtubeExtensionContracts.ts` and cover guest lookup,
  connected learning/reviewing lookup, no-match, hidden/frozen/no-actions,
  phrase translation ready/failed, practice snapshot rough/precise, operation
  running/succeeded, and session authenticated/guest.
- This slice does not add behavior, endpoint calls, storage, or network
  dependencies.

## Phase 1: Practice Readiness Contract

Goal:

Return enough metadata for the extension to show `No captions`, `Rough`,
`Ready`, `Precise`, or `Improving...` without parsing technical provenance.

Target practice snapshot:

```ts
type PracticeSnapshot = {
  videoId: string;
  textSource: PracticeTextSource | null;
  availableTextSources: PracticeTextSource[];
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
    displayState: 'no-captions' | 'rough' | 'ready' | 'precise' | 'improving';
    availableActions: Array<'get-captions' | 'improve-timing'>;
    recommendedAction?: 'get-captions' | 'improve-timing';
    activeOperation?: {
      id: string;
      kind: 'get-captions' | 'improve-timing' | 'align-text';
      state: 'queued' | 'running';
      progress?: number;
    };
    diagnosticFlags?: string[];
  };
};

type PracticeTextSource = {
    id: string;
    revisionId: string;
    contentFingerprint: string;
    languageCode: string;
    label: string;
    kind: 'provided-captions' | 'auto-captions' | 'asr';
    status: 'ready' | 'aligning' | 'failed';
    errorCode?: string;
};
```

Derivation guide:

| UI state | Input conditions | Primary action | Diagnostic detail |
| --- | --- | --- | --- |
| `No captions` | No usable practice phrases from browser, cache, backend, or selected source. | `get-captions` when backend retrieval is allowed. | Missing track, disabled backend, provider failure, or unsupported language. |
| `Rough` | Phrases exist, but timing/source metadata has warnings, approximate split timing, transcript-panel fallback, failed source switch, or low-confidence alignment. | Usually `improve-timing`; sometimes `get-captions` if text itself is suspect. | Keep raw `sourceKind`, `retrievalPath`, `timingExactness`, `qualityFlags`, and warnings in details/debug. |
| `Ready` | Phrases are usable and stable, but high-confidence ASR/alignment timing is not available or not selected. | `improve-timing` may be offered quietly. | Cue timing, normalized phrases, selected Text Source, cache status. |
| `Precise` | High-confidence timing evidence is available, or uploaded/provided phrase boundaries are good enough that no improvement is currently useful. | None. | ASR/aligned timing, word timing, or accepted provider phrase boundaries. |
| `Improving...` | ASR, timing improvement, or pairwise alignment job is queued/running for the current video/source pair. | None while active; details may expose cancel/retry later. | Job id, progress, target text source, timing evidence id. |

Rules:

- `Precise` means no learner action is needed.
- `Ready` means practice is usable and may offer `Improve Timing`.
- `Rough` means usable only as degraded fallback.
- `No captions` may offer `Get Captions`.
- `Improving...` is `readiness.displayState`, not the underlying quality. Keep
  `readiness.baseState` available while the operation runs.
- Failed source switches for non-active sources must not degrade the active
  source's readiness.
- `Get Captions` should appear as `activeOperation.kind = 'get-captions'`, not
  as `Improving...`.

## Phase 2: Get Captions Contract

Goal:

Let the learner explicitly ask backend to retrieve usable captions when
browser-visible captions are missing or insufficient.

Rules:

- Do not start ASR by implication.
- Backend may use cache, YouTube timed text, subtitle extractors such as
  `yt-dlp`, or providers such as Supadata.
- Repeated rapid testing should not trigger uncontrolled provider/extractor
  calls.
- On success, the extension should apply returned captions to the current video
  without a second Apply step.

Endpoint:

```http
POST /api/practice/captions
```

This operation should internally reuse the existing subtitle service. It may
return immediately with `state: "ready"` and a `PracticeSnapshot`, or return
`queued`/`running` with an operation id and polling metadata. Do not hide
user-initiated retrieval behind `GET /api/get-subs?refresh=1`; keep
`GET /api/get-subs` as the cached/read path for initial loading.

First implementation:

- Route: `app/src/app/api/practice/captions/route.ts`.
- Request body accepts `videoId`, optional `language` or `lang`, optional
  `sourceKind: "manual" | "auto"`, and optional `refresh`.
- The route calls `loadSubtitles(videoId, language, { sourceKind, refresh })`
  and returns a synchronous envelope:

```ts
type PracticeCaptionsResponse = {
  state: 'ready';
  operation: {
    id: string;
    kind: 'get-captions';
    state: 'succeeded';
  };
  snapshot: PracticeSnapshot;
};
```

- The returned snapshot includes `snapshotRevisionId`, active `textSource`,
  `availableTextSources`, `timingEvidence`, `phraseSet`, and `readiness`.
- `PracticeTextSource` includes `contentFingerprint`, `status`, and optional
  `errorCode`. In the first slice, `availableTextSources` intentionally
  enumerates only the active source, but it uses the same complete
  `PracticeTextSource` shape as `textSource`.
- `Get Captions` never starts ASR and never reports
  `readiness.displayState = "improving"`. Readiness is derived from the
  returned subtitle artifact: no usable practice phrases becomes
  `no-captions`; approximate or flagged timing becomes `rough`; word-level,
  aligned, or accepted provided-caption cue timing becomes `precise`; other
  cue-timed captions become `ready`.

## Phase 3: Improve Timing Contract

Goal:

Run ASR/alignment only after explicit user intent and expose progress when
available.

Rules:

- Do not automatically run ASR on video open.
- Keep existing caption practice usable while timing improvement runs.
- Return status suitable for `Improving...`.
- Cache ASR artifacts and alignment outputs.
- If the user leaves the video, store the result and show it when they return.

Endpoint:

```http
POST /api/practice/timing-jobs
GET  /api/practice/operations/{operationId}
GET  /api/practice/timing-jobs/{jobId}
```

Do not expose `/api/asr/jobs` directly to the extension as the product
contract. `Improve Timing` may use cached ASR, fresh ASR, forced alignment, word
timing, or cheap pairwise alignment; ASR is an implementation detail.

Implemented first wrapper:

```ts
type PracticeOperation = {
  id: string;
  kind: 'improve-timing';
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  videoId: string;
  input: {
    language?: string;
    sourceKind?: string;
    textSource?: string;
    engine?: string;
    model?: string;
    fullAudio?: boolean;
    durationSec?: number;
    snapshotRevisionId?: string;
    textSourceRevisionId?: string;
    timingEvidenceRevisionId?: string;
  };
  progress?: number;
  pollUrl: string;
  retryAfterMs: number;
  result?: {
    snapshot?: PracticeSnapshot;
    snapshotRevisionId?: string;
    textSourceRevisionId?: string;
    timingEvidenceRevisionId?: string;
    phraseSetRevisionId?: string;
    resultUrl?: string;
    diagnostics?: Record<string, unknown>;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};
```

- `POST /api/practice/timing-jobs` is the product-level `Improve Timing`
  command. It currently wraps the existing ASR job implementation, including
  tester-token auth, queue limits, deduplication, and polling cadence.
- `GET /api/practice/operations/{operationId}` is the required polling surface
  for extension and UI workers. The optional
  `GET /api/practice/timing-jobs/{jobId}` alias returns the same envelope.
- The operation id is distinct from the low-level route contract. Current
  implementation uses a `timing:{asrJobId}` id, but callers should treat it as
  opaque and follow `pollUrl`.
- Completed operations read the ASR result artifact when it is available and
  readable, build a full `PracticeSnapshot`, and expose
  `snapshotRevisionId`, `textSourceRevisionId`, `timingEvidenceRevisionId`, and
  `phraseSetRevisionId`. If the ASR job is complete but the artifact is
  unavailable or unreadable, the envelope returns diagnostics and a low-level
  result URL for troubleshooting rather than pretending a timing revision
  exists.
- Progress is omitted until a worker exposes a reliable progress value.

## Phase 4: Text Source And Pairwise Alignment

Goal:

Support the default priority:

1. uploaded/provided captions text + ASR/aligned timing;
2. ASR transcript + ASR timing when uploaded captions are unavailable;
3. YouTube auto-captions as a selectable fallback when they are better for a
   specific video.

Rules:

- Text Source is selected independently from Timing Evidence.
- Switching text source after ASR may require a fast pairwise alignment.
- If alignment is cheap, run it automatically and show a brief `Improving...`
  transition.
- Do not assume one ASR timing artifact can safely align every text source.

First implementation:

```http
POST /api/practice/source-selection
```

Request accepts `videoId`, optional `language` or `lang`, and one of:
`selectedTextSource.id`, `selectedTextSource.revisionId`,
`selectedTextSource.kind`, top-level `textSourceId`,
`textSourceRevisionId`, `textSourceKind`, or legacy subtitle
`sourceKind: "manual" | "auto"`.

Response on an active-source match:

```ts
type PracticeSourceSelectionResponse = {
  state: 'ready';
  selection: {
    textSourceId: string;
    textSourceRevisionId: string;
    status: 'ready' | 'aligning' | 'failed';
  };
  snapshot: PracticeSnapshot;
  limitations: Array<'first-slice-source-selection-only-active-source-is-enumerated'>;
};
```

Typed non-success responses:

- `source_not_available`: requested source id/revision does not match the
  current active source, or no source exists for the video/language.
- `selection_not_supported_yet`: requested source kind is recognized but not
  selectable in this slice, such as `asr`.

This endpoint deliberately does not invent multi-source storage. It gives UI
workers an executable backend contract and a clear failure shape while the
backend still only knows the active/cached source.

## Phase 5: Recall Mode Phrase Translation

Goal:

Provide translated prompts for whole practice phrases and reusable whole-phrase
translations for Shadow Mode `Show Translation`.

Rules:

- This is not dictionary card translation.
- The same Phrase Translation artifact can serve two UI purposes:
  - in Recall Mode, it is the prompt;
  - in Shadow Mode, it is an optional inline comprehension aid.
- Translation target language belongs to 2000NL user settings by default.
- 2000NL should own provider/prompt policy and translation semantics through a
  generic text-translation operation. AudioFilms owns the media-specific
  association between translated text and YouTube phrase artifacts.
- `GET /api/dict/session` preserves 2000NL preference provenance. If 2000NL
  returns `preferences.source`, such as `platform-default`, AudioFilms forwards
  that value; otherwise it falls back to `user-setting` for older platform
  responses that only expose a target language.
- Cache translations next to phrase/caption artifacts by stable text/context
  hashes, not by video id alone.
- Extension should request a phrase prompt and render it; it should not own
  translation provider policy.

Target 2000NL endpoint:

```http
POST /api/platform/v1/text-translation
```

Target AudioFilms endpoints:

```http
POST /api/practice/phrase-translations
GET  /api/practice/phrase-translations/{translationId}
```

First backend slice implemented:

- `POST /api/practice/phrase-translations` requires a forwarded 2000NL user
  Bearer token and returns `401 authentication_required` /
  `missing_2000nl_user_token` when the token is absent.
- Request body identifies the phrase artifact with `phraseId`, `text` or
  `sourceText`, `sourceLanguageCode`, optional `contextText`, optional
  `phraseSetRevisionId` / `snapshotRevisionId`, and optional
  `targetLanguageCode` override. Normal target-language resolution remains in
  2000NL user settings.
- AudioFilms forwards to 2000NL `POST /api/platform/v1/text-translation` with
  default purpose `youtube-phrase-practice`; caller-supplied purpose must be a
  short safe identifier.
- Response is projected to the phrase artifact shape and intentionally omits
  provider details:

```ts
type PhraseTranslation = {
  phraseId: string;
  phraseSetRevisionId?: string;
  snapshotRevisionId?: string;
  translationId?: string;
  status: 'missing' | 'pending' | 'ready' | 'failed' | string;
  sourceTextHash?: string;
  sourceLanguageCode: string;
  targetLanguageCode?: string;
  translatedText?: string;
  translationPolicyVersion?: string;
  cached?: boolean;
  error?: { code: string; message?: string };
};
```

Current limitation:

- 2000NL exposes POST-only text translation. AudioFilms `GET
  /api/practice/phrase-translations/{translationId}` reads the lightweight local
  phrase association cache populated by POST. If the association is missing, GET
  returns `404 not_available` and callers should create/request the translation
  through POST.

Open contract choices:

- whether Shadow Mode `Show Translation` is current-phrase only or a sticky
  preference across phrase navigation. Safe default: current phrase only until a
  designer proposes a clear sticky state.

Safe first-implementation defaults:

- Use an explicit phrase-translation endpoint or action wrapper; do not reuse
  dictionary-card translation as an implicit substitute.
- Cache phrase translations by source language + target language + normalized
  source text hash + optional context hash + translation policy version.
- Recall should show the phrase row with a compact `Translating...` state while
  translation is missing; it should not silently fall back to original text.
- Shadow `Show Translation` should translate on first `T` press for the current
  phrase unless prefetch is already cheap/reliable.
- `Show Translation` is current-phrase only for now.

Legacy candidate response shape superseded by the implemented shape above:

```ts
type PhraseTranslation = {
  phraseId: string;
  phraseSetRevisionId?: string;
  snapshotRevisionId?: string;
  translationId?: string;
  status: 'missing' | 'pending' | 'ready' | 'failed' | string;
  sourceTextHash?: string;
  sourceLanguageCode: string;
  targetLanguageCode?: string;
  translatedText?: string;
  translationPolicyVersion?: string;
  cached?: boolean;
  error?: { code: string; message?: string };
};
```

## Phase 6: Recall Reverse Lookup

Goal:

In Recall Mode, clicking a translated word should map back to an
original-language token/span and open the normal dictionary card for that
candidate.

Non-goal:

- Do not make word click unavailable in Recall as the target behavior.

Candidate approaches:

1. Precomputed translation alignment between translated phrase tokens and
   original phrase tokens.
2. Contextual reverse lookup using clicked translated word, translated phrase,
   and original phrase.

Decision needed:

- start with the fastest reliable prototype and measure accuracy/latency;
- cache the mapping if it uses expensive inference.

## Phase 7: Dictionary Card State Contract

Goal:

Let UI render state-appropriate actions:

- not started: `Learn` and `Known`;
- learning/reviewing: `Again`, `Hard`, `Good`, `Easy`;
- translation: separate secondary action, not in the review row.

Needed fields:

- stable card id and entry id;
- clicked form and returned headword relationship, when the clicked form differs
  from the dictionary headword. Do not require a separate `lemma` field until
  2000NL can state that it is genuinely a lemma;
- compact metadata chips: part of speech, language, dictionary/source, `2K` or
  other frequency/list markers when appropriate, gender/form hints;
- collapsed summary fields: short definition and optionally one example;
- expandable rich sections: meanings, examples, idioms, forms, and notes;
- optional translation overlay content aligned to definition/example/idiom lines;
- optional personal encounter signal, such as combined seen count and last seen;
- card state projected for the overlay, with explicit mapping from 2000NL
  progress states such as `hidden`/`known` when that platform drift is resolved;
- available 2000NL action/result ids;
- AudioFilms overlay display actions derived from those ids;
- review result ids supported by 2000NL;
- target translation language or enough session metadata for backend to infer it.

Target AudioFilms lookup endpoint:

```http
POST /api/dict/lookup
```

Do not send phrase context in the URL. The current GET lookup may remain for
legacy consumers, but V2 should use a JSON body so context is not exposed in
logs, caches, and URL-length-sensitive infrastructure.

Target 2000NL lookup additions:

```ts
type PlatformLookupRequestV2 = {
  query: string;
  languageCode?: string;
  contextText?: string;
  includeUserState?: boolean;
  intent?: 'external-click';
};
```

Candidate additive V2 shape:

```ts
type DictionaryOverlayCardV2 = {
  id: string;
  entryId: string;
  clickedForm: string;
  headword: string;
  match?: {
    matchedForm?: string;
    relation: 'exact' | 'inflection' | 'lemma' | 'fuzzy' | 'unknown';
  };
  contentFingerprint?: string;
  chips: Array<{
    kind: 'part-of-speech' | 'language' | 'dictionary' | 'list' | 'form' | 'other';
    label: string;
    value?: string;
  }>;
  summary: {
    definition: string;
    example?: string;
  };
  sections: Array<{
    kind: 'meaning' | 'example' | 'idiom' | 'form' | 'note';
    label?: string;
    text: string;
    translation?: string;
  }>;
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
  displayActions: Array<{
    id: 'learn' | 'known' | 'again' | 'hard' | 'good' | 'easy' | 'translate';
    label: 'Learn' | 'Known' | 'Again' | 'Hard' | 'Good' | 'Easy' | 'Translate';
    group: 'progress' | 'translation';
    command:
      | {
          kind: 'platform-action';
          action: 'start-learning' | 'mark-known' | 'review-card';
          result?: 'fail' | 'hard' | 'success' | 'easy';
          turnIdRequired?: boolean;
        }
      | { kind: 'card-translation' };
  }>;
  encounter?: {
    seenCount?: number;
    lastSeenAt?: string;
  };
  diagnostics?: {
    platformActions?: Array<{
      id: 'record-view' | 'start-learning' | 'mark-known' | 'mark-unknown' | 'review-card' | string;
      reviewResultId?: 'fail' | 'hard' | 'success' | 'easy' | string;
    }>;
  };
};
```

Rules:

- The extension should not parse raw 2000NL dictionary payloads to infer lemma,
  chips, rich sections, or progress.
- `displayActions` are the only UI source of truth. Raw platform capabilities
  are diagnostics only and must not be independently rendered.
  Do not submit `learn`, `known`, `again`, `hard`, `good`, or `easy` as 2000NL
  action ids.
- `translate` must not appear as a 2000NL platform action; it is a separate
  card-translation command.
- Required label/payload mapping for the redesign:
  - `Learn` -> `start-learning`;
  - `Known` -> `mark-known`;
  - `Again` -> `review-card` + `fail`;
  - `Hard` -> `review-card` + `hard`;
  - `Good` -> `review-card` + `success`;
  - `Easy` -> `review-card` + `easy`.
- 2000NL currently has a status-name drift that the architect should resolve or
  normalize: platform docs/runtime expose `hidden`, while one shared type has
  referred to `known`. AudioFilms should not treat those names as final UI
  states. The architect should decide whether the platform canonical state is
  `hidden`, `known`, or both, and how AudioFilms projects it into overlay
  `userState` and the `Known` display action.
- For the first redesign, use `Learn`/`Known` for `not-started` and
  `encountered`, the four review grades for `learning` and `reviewing`, and no
  progress row for `hidden` or `frozen`.
- Explicit mutation actions that can review or complete a card (`review-card`,
  `mark-known`, and `mark-unknown`) must include a client-generated `turnId` and
  reuse it across retries to prevent duplicate reviews. AudioFilms rejects
  missing, empty, or malformed `turnId` values for those actions at
  `/api/dict/actions` before forwarding to 2000NL. The current 2000NL
  `start-learning` action is not marked `turnId`-required by AudioFilms
  `displayActions`, so AudioFilms still allows it without `turnId`.
- `record-view` must not be emitted from default YouTube lookup
  `displayActions`. `/api/dict/actions` may continue to accept it as a
  non-default diagnostic/future explicit encounter command, but ordinary card
  rendering and word clicks stay read-only.
- Personal encounter signals should stay quiet in the card footer. Do not make
  YouTube lookup become an analytics dashboard.
- Return `lastSeenAt`; the UI should format the relative label.
- Card translation overlays need stable section ids or `sourcePath` before
  line-level definition/example/idiom placement is guaranteed. Block-level
  translation can ship first.
- List membership and action-log review views belong primarily in the main
  2000NL/app surfaces, not in the YouTube dictionary panel, unless a compact chip
  is clearly useful.

Open encounter/logging choices:

- Does a YouTube word click count as a `seen` encounter, a `clicked` encounter,
  both, or a more specific action-log event?
- Does rendering a dictionary card without an explicit Learn/Known/review action
  update encounter stats?
- Should `Seen` include exposures from 2000NL review, YouTube lookup, and main
  dictionary search, or only active card views?
- What quiet personal fields are worth returning to the extension first:
  combined seen count and last seen, or separate seen/clicked/reviewed counts?

## Suggested Work Split

Order:

1. Architect reviews this contract plan and `docs/intent/youtube-extension-designer-brief.md`.
2. Backend agent implements or stubs contract fields behind existing endpoints.
3. UI agent redesigns layout using the new vocabulary and consumes stubs.
4. Backend and UI converge on real jobs/caches for `Get Captions`,
   `Improve Timing`, and Recall.

Parallelism:

- UI grouping and static layout can proceed after Phase 0 if stub data exists.
- Backend job/cache work can proceed in parallel after field names and state
  machine are agreed.
- Recall reverse lookup should wait until phrase translation contract exists.

## Related Docs

- `CONTEXT.md`
- `docs/intent/youtube-extension-designer-brief.md`
- `docs/intent/subtitle-practice-contract.md`
- `docs/exec-plans/active/rolling-caption-alignment-quality.md`
- `docs/exec-plans/active/backend-deployment-plan.md`
- `docs/adr/0001-backend-owned-practice-phrase-building.md`
- `docs/adr/0002-2000nl-dictionary-platform-boundary.md`
