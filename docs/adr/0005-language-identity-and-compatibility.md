# Language Identity and Compatibility

## Status

Accepted. Initial backend and extension adapters are implemented; migration of
all callers and live rollout continue under the active execution plan.

## Context

YouTube exposes caption languages as BCP-47-like tags, such as `nl-NL`,
`pt-BR`, and `zh-Hans`. Whisper accepts a shorter language code, such as `nl`,
`pt`, or `zh`. The extension also needs to restore a user's selected caption
track after reload. Treating all of these values as one string caused valid
locale variants to miss the stored selection and made the extension fall back
to another language.

## Decision

AudioFilms represents language identity in three related forms:

- `canonicalTag`: normalized BCP-47-like tag used for caption source identity
  and diagnostics;
- `baseLanguage`: language family used only for cautious compatibility checks;
- `asrLanguage`: supported Whisper code used in ASR requests and artifact
  identity.

Language comparison is intent-specific:

- exact source matching prefers the stable provider track id and then the full
  canonical tag;
- source restoration may use a compatible base-language match only when it is
  unambiguous;
- conflicting regions or scripts are incompatible (`pt-BR` vs `pt-PT`,
  `zh-Hans` vs `zh-Hant`);
- ASR accepts only the supported `asrLanguage` set and legacy aliases are
  normalized through the shared contract data.

The alias and supported-language data has one source under
`app/scripts/language-identity-data.json`. Backend TypeScript, the local
alignment script, Python, and the no-build extension consume that data through
runtime-specific adapters. The extension artifact is regenerated with
`npm run language:sync`.

## Consequences

- A locale spelling change does not require a new language-specific patch in
  source selection or ASR callers.
- Caption tracks with different regional or script meanings remain distinct.
- The extension can restore `nl-NL` from a YouTube track reported as `nl` when
  that fallback is unambiguous.
- Runtime adapters remain because the extension is a no-build classic-script
  bundle and the worker is Python; conformance tests and generated data keep
  their behavior aligned.
- Unknown languages can remain visible as caption sources but fail clearly at
  the Whisper boundary.
