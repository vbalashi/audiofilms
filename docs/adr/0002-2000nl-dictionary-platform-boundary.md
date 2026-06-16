# 2000NL Dictionary Platform Boundary

Accepted.

AudioFilms will treat 2000NL as the dictionary, progress, action, and translation authority for Dutch word lookup. AudioFilms will not duplicate 2000NL's dictionary domain model, progress semantics, action IDs, card type IDs, or translation cache rules.

The YouTube overlay still has its own presentation needs. AudioFilms backend owns the shallow overlay projection from 2000NL lookup results into display-oriented dictionary meaning cards. The extension should render that backend-provided shape and should not parse 2000NL `entry.raw` directly.

The first overlay card model follows these rules:

- one AudioFilms overlay card maps to one top-level 2000NL `lookup.items[]` result;
- nested `entry.raw.meanings[]` are content inside that card, not separate action targets;
- overlay actions always target `cardTypeId=word-to-definition`;
- plain lookup is read-only and must not automatically call `record-view`;
- all learning/progress changes happen only after an explicit user action on one card;
- after a successful action, AudioFilms refreshes lookup instead of simulating updated progress locally;
- translation is requested per card through 2000NL `POST /api/platform/v1/translation` using `entryId` and `targetLang`.

Consequences:

- AudioFilms `/api/dict` must grow beyond the legacy flat `definition` result for rich-card consumers.
- AudioFilms backend may derive labels, collapsed content, examples, and ordering for its overlay, but it must not invent dictionary meanings, action IDs, review result IDs, progress states, or card types.
- The extension does not own 2000NL auth or tokens in the first architecture. It calls AudioFilms backend for lookup, actions, and translation; AudioFilms proxies to 2000NL.
- Button localization is intentionally separate from this boundary. The first slice can display technical action/result IDs until a global UI localization decision exists.
