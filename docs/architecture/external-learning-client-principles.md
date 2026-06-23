# External learning client principles

Date: 2026-06-23

These principles apply to AudioFilms as an external 2000NL learning client, especially the YouTube shadowing extension.

## 1. AudioFilms observes context; 2000NL owns learning state

AudioFilms owns:

- YouTube/shadowing UX;
- phrase rendering;
- caption-source observation;
- clicked-word context;
- shallow dictionary overlay rendering;
- explicit learner intent.

2000NL owns:

- dictionary entry identity;
- card type IDs;
- available actions;
- review result IDs;
- FSRS/current card state;
- source-context normalization;
- provenance persistence;
- learning read models.

Do not simulate 2000NL progress state inside AudioFilms after an action. Refresh from the Platform boundary instead.

## 2. Lookup stays read-only

Clicking a word and loading dictionary cards must not mutate 2000NL learning state.

Only explicit learner actions such as `Learn`, `Known`, `Again`, `Hard`, `Good`, and `Easy` may call the mutation endpoint.

## 3. Freeze source binding at click time

When the user clicks a word, capture a frozen source binding. Every later action on that lookup result must use that binding.

Do not rebuild provenance from current page state at action time. Between lookup and action, YouTube may navigate, caption sources may switch, phrases may rebuild, or playback time may change.

A stale card from a previous video must be rejected with a visible recoverable error, not submitted under the new video id.

## 4. Keep canonical and diagnostic data separate

Canonical source-context fields:

- YouTube video id;
- caption/practice artifact identity;
- phrase locator;
- clicked token/character locator;
- bounded phrase context.

Diagnostic/observation fields:

- current playback time;
- DOM title;
- retrieval attempts;
- warnings;
- fallback reason;
- debug version fields.

Observation and diagnostics must not control idempotency or canonical source identity.

## 5. Preserve backend practice artifacts

When backend practice captions are available, preserve their identifiers:

- snapshot revision;
- text source id/revision;
- timing evidence revision;
- phrase-set revision;
- content fingerprint;
- timing quality.

Do not convert backend-owned practice phrases into generic cues and then rebuild them locally before provenance is created.

## 6. Extension fallback must be explicit

Fallback phrase building is allowed, but it must be labeled as fallback.

Fallback artifacts need:

- producer = `audiofilms_extension_fallback`;
- stable builder version;
- deterministic fingerprint;
- degraded/approximate timing quality when appropriate.

Never mint backend revision ids in the extension fallback path.

## 7. One action, one retry envelope

One intentional learner action gets one UUID `clientEventId`.

Transport retries must reuse the same serialized payload. A second intentional user press is a new action and gets a new id.

Do not resample source, phrase, diagnostics, title, or playback state while retrying the same action.

## 8. Service worker owns credentials

The service worker is the authenticated network boundary.

Content scripts must not receive 2000NL access tokens, refresh tokens, or long-lived platform credentials.

Bearer tokens should only be attached to allowlisted AudioFilms/2000NL routes.

## 9. UI labels are not Platform IDs

AudioFilms may localize or change button text, but must not invent action/result IDs.

Use the action IDs and available capabilities returned by the Platform/dictionary boundary.

## 10. Keep provider internals below the backend projection

The extension should render the AudioFilms overlay shape and should not parse 2000NL `entry.raw` directly.

If the UI needs another field, add it to the documented overlay projection or Platform contract. Do not teach the extension to infer behavior from provider internals.

## 11. Refactor the extension incrementally

The YouTube content script is large. Improve it by extracting no-build modules in this order:

1. source binding and source-context builder;
2. dictionary command/action lifecycle;
3. phrase tokenization and clicked-token locator;
4. debug/report formatting;
5. layout/preferences.

Do not migrate to a bundler or TypeScript as part of a small provenance change unless that migration is explicitly scoped and tested.

## 12. Validation expectations

Changes to source-aware dictionary actions should test or manually smoke:

- backend captions;
- direct timed-text fallback;
- transcript-panel fallback;
- source switch after lookup;
- YouTube SPA navigation after lookup;
- repeated word occurrence in one phrase;
- retry/error behavior;
- token isolation in the service worker;
- lookup remaining read-only;
- post-action lookup refresh.

## 13. Do not broaden scope accidentally

Do not combine YouTube provenance changes with:

- removal of fallback phrase builders;
- broad subtitle-provider redesign;
- direct extension-to-2000NL migration;
- dictionary model cleanup;
- Pontix work;
- a shared external-client SDK.

Keep AudioFilms focused on YouTube learning UX and the documented 2000NL Platform boundary.