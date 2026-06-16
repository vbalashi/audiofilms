# 2000NL Platform Dictionary Integration

Status: dogfood slice implemented; remaining work is product hardening and ADR-0001 follow-up, June 16, 2026.

## Goal

When a learner clicks a word in an AudioFilms practice phrase, AudioFilms should call the 2000NL platform dictionary API and show real dictionary matches, progress context, and later explicit learning actions.

This replaced the YouTube extension placeholder dictionary copy with real backend lookup wiring. It should eventually supersede AudioFilms' standalone LLM dictionary provider path for Dutch lookup when 2000NL is configured.

## Existing AudioFilms State

AudioFilms currently has:

- app route: `app/src/app/api/dict/route.ts`;
- explicit action route: `app/src/app/api/dict/actions/route.ts`;
- per-card translation route: `app/src/app/api/dict/translation/route.ts`;
- lookup orchestration: `app/src/lib/dictionaryLookup.ts`;
- 2000NL platform proxy helper: `app/src/lib/twoThousandNlPlatform.ts`;
- provider system: `app/src/lib/providers/dictionary/`;
- 2000NL provider: `app/src/lib/providers/dictionary/TwoThousandNlDictionaryProvider.ts`;
- extension dictionary UI rendering, action buttons, and per-card translation in `extensions/youtube-shadowing/src/content.js`;
- extension service worker bridge for subtitles, dictionary fetches, and 2000NL Connect session management.

The current `/api/dict` route can call local dictionary providers (`openrouter`, `openai`, `free-dictionary`) or 2000NL. 2000NL is selected through `DICTIONARY_PROVIDER=2000nl`, and incoming extension Bearer tokens override the local dogfood env token when present.

## Existing 2000NL Platform API

2000NL source lives at:

```text
/Users/khrustal/dev/2000nl
```

Production service:

```text
https://2000.dilum.io
```

Relevant source/docs:

- `docs/reference/platform-api.md`;
- `docs/reference/api-functions/search-and-user.md`;
- `apps/ui/app/api/platform/v1/lookup/route.ts`;
- `apps/ui/app/api/platform/v1/analyze-selection/route.ts`;
- `apps/ui/app/api/platform/v1/actions/route.ts`;
- `apps/ui/lib/platform/platformApi.ts`;
- `packages/shared/types/platform.ts`;
- `apps/ui/tests/api/platformV1Routes.test.ts`.

Canonical route for lookup:

```text
POST /api/platform/v1/lookup
```

Request:

```json
{
  "query": "huis",
  "includeUserState": true
}
```

Response:

```json
{
  "query": "huis",
  "items": [
    {
      "entry": {
        "id": "entry-id",
        "dictionaryId": "dictionary-id",
        "languageCode": "nl",
        "headword": "huis",
        "meaningId": 1,
        "partOfSpeech": "zn",
        "gender": "het",
        "raw": {}
      },
      "dictionary": {
        "id": "dictionary-id",
        "slug": "nl-vandale",
        "name": "VanDale Dutch",
        "kind": "curated",
        "visibility": "system",
        "schemaKey": "nl-vandale-v1",
        "schemaVersion": 1
      },
      "userStateByCardType": {},
      "progressSummary": {},
      "listMemberships": [],
      "availableActions": []
    }
  ]
}
```

Auth/CORS requirements:

- `Authorization: Bearer <supabase-user-access-token>`;
- browser/extension origins must be allowed via `PLATFORM_API_ALLOWED_ORIGINS`;
- lookup is read-only;
- mutations go through `POST /api/platform/v1/actions`.

The Bearer token is not a Codex/browser setting and not a generic project API key. It is a Supabase access token issued by the 2000NL Supabase project for one authenticated 2000NL user. It carries that user's identity and permissions, and it expires. Using `DICTIONARY_2000NL_ACCESS_TOKEN` in AudioFilms env is therefore a dogfood/smoke shortcut, not the final session architecture.

## Product Policy

Plain word click should be read-only.

The first integration should:

1. click word;
2. send selected word plus current phrase context to the AudioFilms backend;
3. AudioFilms backend calls 2000NL platform lookup;
4. extension displays the best dictionary candidates;
5. no learning progress mutation happens implicitly.

Explicit later actions:

- record view;
- start learning;
- mark known / unknown;
- review card;
- add to list;
- copy to user dictionary.

Those must call `POST /api/platform/v1/actions` only after an explicit user action.

## Architecture Decision

Accepted ADR-0002 chooses the AudioFilms backend proxy boundary for the first architecture.

Options:

1. **AudioFilms backend proxy with server-side 2000NL token**
   - AudioFilms `/api/dict` calls 2000NL.
   - Extension never talks to 2000NL directly.
   - Simpler CORS story.
   - Needs a clear way to obtain/store the user's 2000NL Supabase access token or a service-to-service token model.

2. **Extension calls 2000NL directly**
   - Uses 2000NL platform API exactly as designed for browser extensions.
   - Requires extension auth flow and token storage.
   - Requires 2000NL CORS allowlist for the extension origin.
   - Keeps AudioFilms backend out of user-token handling.

3. **Hybrid**
   - AudioFilms app uses backend proxy.
   - YouTube extension uses direct 2000NL platform API after connecting 2000NL.
   - More moving parts but matches each runtime's constraints.

Current decision:

Use **AudioFilms backend proxy** for lookup, actions, and translation. The extension may own a 2000NL Connect session for dogfood, but it still calls AudioFilms `/api/dict*`; AudioFilms forwards the current Bearer token to 2000NL. `DICTIONARY_2000NL_ACCESS_TOKEN` remains a short-lived local fallback. Revisit direct extension-to-2000NL platform calls only if the product intentionally changes the proxy boundary.

## AudioFilms Runtime Shape

The 2000NL dictionary provider is available behind the existing AudioFilms dictionary provider interface:

```text
DICTIONARY_PROVIDER=2000nl
DICTIONARY_2000NL_API_BASE=https://2000.dilum.io/api/platform/v1
DICTIONARY_2000NL_ACCESS_TOKEN=...
```

First slice can call:

```text
POST ${DICTIONARY_2000NL_API_BASE}/lookup
```

with:

```json
{
  "query": "huis",
  "includeUserState": true
}
```

AudioFilms adapts the 2000NL response into the current app/extension response:

- selected word;
- headword;
- definitions/examples/translations from `entry.raw`;
- dictionary source label;
- progress summary if present;
- available actions as disabled/visible affordances.

The response now keeps the legacy flat `definition` result and exposes richer `cards[]` with `meta.responseVersion="overlay-v1"` for extension/UI consumers.

## Implementation Stages

### Stage 0: Contract Smoke

Status: completed for the first dogfood slice.

Verify 2000NL platform API can answer:

```text
POST https://2000.dilum.io/api/platform/v1/lookup
```

with a Bearer Supabase user token.

Check:

- `OPTIONS` CORS response for extension/app origin;
- `401`/`403` behavior without token;
- empty match response for unknown words;
- successful match for a known Dutch word such as `huis`.

Exit criteria:

- We know the exact local base URL and token source for development.

Current production smoke, June 16, 2026:

- `GET https://2000.dilum.io/api/health?deep=1` returned `status=ok`, `database.target=remote`, and `platformRpcContract.status=ok`.
- `POST /api/platform/v1/lookup` without Bearer token returned `401 missing_bearer_token`.
- Server-side lookup with a minted Supabase user token returned one `huis` match from `nl-vandale`.
- `includeUserState=true` returned `progressSummary.status=new` for the test user.
- CORS preflight from YouTube and the local unpacked extension origin returned `204` but no `access-control-allow-origin`, so direct browser/extension calls need production CORS configuration before they can work.

### Stage 1: AudioFilms 2000NL Provider

Status: completed for the first dogfood slice.

Add a `2000nl` dictionary provider in AudioFilms.

Responsibilities:

- read base URL and access token from env;
- POST to `/lookup`;
- map 2000NL errors to `DictionaryError`;
- adapt the first useful candidate into current `DictionaryResult`;
- preserve provider metadata as `provider=2000nl`;
- keep existing providers as fallback only if configured.
- expose rich `cards[]` through the service response while keeping legacy `result.definition`.

Exit criteria:

- `GET /api/dict?word=huis&language=nl&context=...` returns data from 2000NL.
- Existing app dictionary panel still works.

### Stage 2: Extension Lookup Wiring

Status: completed for the first dogfood slice.

Extend the service worker bridge beyond subtitles:

- add message type for dictionary lookup;
- call AudioFilms `/api/dict` from the service worker;
- add loading/ready/error states to extension `selectedWord`;
- render dictionary matches instead of placeholder copy;
- preserve current phrase context and source metadata in debug/Mark Issue.

Exit criteria:

- Clicking a word in YouTube extension shows a real 2000NL result.
- Lookup failure is visible but does not disturb playback.

### Stage 3: Rich Result Shape

Status: completed for the first dogfood slice.

Move beyond a single definition string.

Expose:

- multiple candidates;
- dictionary metadata;
- examples/translations;
- progress summary;
- available actions.

Exit criteria:

- The UI can distinguish dictionary candidates and user progress without parsing provider-specific `raw`.

## Feature Note: Meaning-Level Dictionary Cards

The clicked word should not render as one flattened text answer. A lookup can return several plausible dictionary candidates because the same surface word can map to multiple meanings, parts of speech, dictionaries, or card types.

Target behavior:

1. AudioFilms asks the dictionary API for the clicked word, with phrase context available for ranking.
2. The response preserves a list of candidate cards instead of collapsing everything into the first definition.
3. The UI renders each candidate as its own compact card.
4. Each candidate card owns its own learning buttons, because the learner is judging that specific meaning/card, not the headword globally.
5. Plain lookup remains read-only; remembered/forgotten/known/unknown actions are explicit mutations.

Candidate card content should be biased toward fast shadowing use:

- headword or matched form;
- compact labels for part of speech, grammatical metadata, dictionary/source, and progress state;
- primary definition;
- one high-value example when available;
- per-card action buttons such as remembered / forgot or known / unknown, using the 2000NL action vocabulary once confirmed;
- an expand affordance for longer content.

Action visibility rule:

- Do not invent actions that are not present in `availableActions`.
- Plain lookup must not mutate state, including no automatic `record-view` when cards are displayed.
- All progress changes require an explicit learner action on one specific overlay card.
- After a successful action, refresh lookup for the same clicked word instead of locally simulating the new progress state.
- AudioFilms overlay actions always target `cardTypeId=word-to-definition`. This surface is for checking a clicked word's meaning/definition or optional translation, not for reverse cards, listening cards, or typing cards.
- For a new/untracked meaning card, the first learner-facing UI should show two primary actions when available: "Learn" backed by `start-learning`, and "I already know this" backed by `mark-known`.
- Do not show `mark-unknown` as a primary action for a new/untracked card in the first UI slice; choosing "Learn" already communicates that the card is not known well enough.
- For a meaning card already in learning/review flow, show all four review grades used by 2000NL flash cards: `fail`, `hard`, `success`, and `easy`. Do not simplify this state to two remembered/forgot buttons.
- The exact learner-facing labels can be localized/adapted for AudioFilms, but the submitted action IDs and review result IDs must remain 2000NL platform values.
- In the first slice, do not introduce a dedicated localization layer or local label mapping for these buttons. Display the technical action/result IDs such as `start-learning`, `mark-known`, `fail`, `hard`, `success`, and `easy`. Treat UI localization as a separate product setting later.
- If 2000NL later returns a more restrictive `availableActions` set per status, AudioFilms should follow it rather than maintaining its own competing permission model.

Expanded content can include:

- additional definitions or contexts;
- more examples;
- idioms;
- translations when they are already present on the lookup payload;
- source/schema/debug details only in a developer/debug view, not as learner-facing prose.

In the YouTube overlay, expansion should happen inline inside the same candidate card. Do not open a separate detail panel in the first slice. The collapsed state should stay suitable for quick shadowing: labels, primary definition, at most one example, and the relevant per-card actions.

Translation rule for the first slice:

- `POST /api/platform/v1/lookup` does not generate provider-backed translation overlays and does not read `word_entry_translations`.
- Source translations can still be present inside `entry.raw` for dictionary schemas that provide them, but those are different from provider-backed translation overlays.
- 2000NL now exposes `POST /api/platform/v1/translation` for external clients.
- AudioFilms should call translation only after lookup, using the selected `items[].entry.id` and the desired `targetLang`.
- Translation requests may write the 2000NL translation cache, but they do not mutate FSRS state, list membership, or source dictionary entries.
- In the overlay, translation should be a per-card affordance. It means "show/request translation for this card", not "translate the clicked word globally".
- If the translation endpoint returns `status=ready`, render the returned overlay inside the expanded card.
- If it returns `status=pending`, show an in-card pending state and retry later.
- `force` should remain false for normal AudioFilms usage.

Rendering direction:

- mirror the 2000NL card language from `DictionarySearchTab` and `WordDetailPanel`;
- show source and part of speech as small labels/chips, not as `Source: 2000NL` body text;
- keep the first view compact enough for a YouTube overlay;
- avoid one global button row for all meanings.
- render all returned cards in a scrollable overlay list; do not hide later candidates behind a "show more" control in the first slice.

API shape implication:

The current AudioFilms `DictionaryResult` shape is too flat for this feature. 2000NL remains the authority for dictionary entries, user state, progress, and allowed actions, but AudioFilms owns the presentation projection for the YouTube overlay.

Do not push YouTube-overlay-specific display decisions into 2000NL. The 2000NL platform lookup already returns the necessary source data for the first rich-card slice: `entry`, `dictionary`, `progressSummary`, `availableActions`, `userStateByCardType`, and `entry.raw.meanings`. AudioFilms should derive a local overlay card view from that response and keep that projection intentionally shallow.

The projection should live in the AudioFilms backend, not inside the YouTube extension. The extension should receive a stable, display-oriented `items[]` shape and should not parse `entry.raw.meanings` or 2000NL metadata directly.

Illustrative target direction for the AudioFilms overlay projection:

```json
{
  "query": "maar",
  "language": "nl",
  "provider": "2000nl",
  "items": [
    {
      "id": "entry-or-card-id",
      "headword": "maar",
      "matchedText": "Maar",
      "partOfSpeech": "vw",
      "labels": ["vw", "VanDale Dutch", "new"],
      "definition": "een woord dat tussen woorden of zinnen staat die een tegenstelling vormen",
      "examples": [],
      "idioms": [],
      "translation": null,
      "progressSummary": {},
      "availableActions": []
    }
  ]
}
```

The important requirement is that item identity must be stable enough to target a single 2000NL meaning/card with an explicit action. AudioFilms may choose what to show, hide, collapse, or label in the overlay, but it must not invent dictionary meanings, progress states, or action IDs.

Mapping rule:

- One AudioFilms overlay card maps to one top-level 2000NL `lookup.items[]` result.
- The 2000NL `entry.id`, `entry.meaningId`, `progressSummary`, `userStateByCardType`, and `availableActions` on that item define the action target and state for the card.
- Nested `entry.raw.meanings[]` are rendered as content inside that card, not as separate action targets.
- Example: `maar` can return two top-level items: `meaningId=1`, `partOfSpeech=vw`, definition about contrast between clauses; and `meaningId=2`, `partOfSpeech=bw`, definition `steeds, voortdurend`. These become two overlay cards with independent actions.

### Stage 4: Explicit Actions

Status: partially implemented for the first dogfood slice.

Wire explicit user actions only after read-only lookup is stable:

- start learning;
- mark known;
- review card;
- per-card translation.

Not implemented in this slice:

- add to list;
- copy to user dictionary;
- complete review-grade surface for `hard` and `easy` in the extension UI.

Exit criteria:

- No mutation happens on plain lookup.
- Every mutation goes through `/api/platform/v1/actions` and is reflected in refreshed lookup state.
- The YouTube extension sends action requests to AudioFilms backend, and AudioFilms backend proxies them to 2000NL.
- The extension can store a 2000NL Connect session and forward its current Bearer token to AudioFilms. It does not call 2000NL platform lookup/actions/translation directly in the first architecture.

## Documentation / ADR

Accepted ADR:

```text
docs/adr/0002-2000nl-dictionary-platform-boundary.md
```

Decision recorded:

- 2000NL is the dictionary, progress, action, and translation authority.
- AudioFilms backend owns the YouTube overlay projection and proxy boundary.
- The extension renders backend-provided lookup/action/translation results and does not parse 2000NL `entry.raw` directly.
- Plain lookup is read-only; learning mutations are explicit per-card actions.
- Translation is a per-card operation through `POST /api/platform/v1/translation`.

## Open Questions

1. Should lookup include phrase context in the 2000NL request once 2000NL supports context-aware ranking? Today AudioFilms preserves context locally but sends only `query` and `includeUserState`.
2. What is the product fallback policy when 2000NL is down: show LLM provider result, show no result, or show both with source labels?
3. Is the extension-owned 2000NL Connect session the durable product model, or should the web app also gain its own first-party 2000NL session/connect UX?
4. Should the extension expose all review results (`fail`, `hard`, `success`, `easy`) in the first polished action surface, or keep the current narrower Start/Known/Again/Good dogfood controls?
