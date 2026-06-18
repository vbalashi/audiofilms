# 2000NL Dictionary Platform Boundary

Accepted.

AudioFilms will treat 2000NL as the dictionary, progress, action, and translation authority for Dutch word lookup. AudioFilms will not duplicate 2000NL's dictionary domain model, progress semantics, action IDs, card type IDs, or translation cache rules.

The YouTube overlay still has its own presentation needs. AudioFilms backend owns the shallow overlay projection from 2000NL lookup results into display-oriented dictionary meaning cards. The extension should render that backend-provided shape and should not parse 2000NL `entry.raw` directly.

The first overlay card model follows these rules:

- one AudioFilms overlay card maps to one top-level 2000NL `lookup.items[]` result;
- normalized 2000NL `entry.content` is the preferred content source; legacy
  `entry.raw` is diagnostic/compatibility data, not an extension UI contract;
- overlay actions always target `cardTypeId=word-to-definition`;
- plain lookup is read-only and must not automatically call `record-view`;
- all learning/progress changes happen only after an explicit user action on one card;
- after a successful action, AudioFilms refreshes lookup instead of simulating updated progress locally;
- translation is requested per card through 2000NL `POST /api/platform/v1/translation`
  using `entryId`; `targetLang` may be omitted when 2000NL can resolve the
  connected user's preference.

Consequences:

- AudioFilms `/api/dict` must grow beyond the legacy flat `definition` result for rich-card consumers.
- AudioFilms backend may derive labels, collapsed content, examples, and ordering for its overlay, but it must not invent dictionary meanings, action IDs, review result IDs, progress states, or card types.
- The extension may own the 2000NL Connect session and store/refresh the current
  2000NL access token because the YouTube runtime needs a browser-side connect
  flow. It still calls AudioFilms backend for lookup, actions, and translation;
  AudioFilms remains the proxy/orchestrator that calls 2000NL platform APIs with
  the forwarded Bearer token.
- Write identity is fail-closed: `/api/dict/actions` and authenticated
  `/api/dict/translation` require a forwarded user Bearer token and must never
  fall back to `DICTIONARY_2000NL_ACCESS_TOKEN`. Any environment credential is
  read-only dogfood/service fallback only.
- Button localization is intentionally separate from 2000NL payload IDs. The
  polished YouTube extension UI should display `Learn`, `Known`, `Again`,
  `Hard`, `Good`, and `Easy`; submitted action/result IDs remain 2000NL platform
  values.
