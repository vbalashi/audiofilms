# Language Identity Unification

Status: active

Owner: AudioFilms backend and YouTube shadowing extension

## Goal

Make language handling consistent across YouTube caption tracks, the Chrome
extension, AudioFilms API/ASR jobs, the local alignment script, and the Python
Whisper adapter. A new language or locale variant must not require a one-off
fix in a caller.

## Decisions

- `canonicalTag` is the source identity used for captions and UI metadata.
- `baseLanguage` is used only for cautious compatibility checks.
- `asrLanguage` is the normalized code accepted by Whisper and used in ASR
  identity.
- `pt-BR` and `pt-PT` remain distinct caption sources.
- A bare tag such as `nl` may match `nl-NL` during source restoration only
  when the candidate is unambiguous.
- `zh-Hans` and `zh-Hant`, and other conflicting scripts, never match through
  base-language fallback.
- ASR reuse requires compatible audio identity and ASR configuration; timing
  reuse additionally requires the selected text content fingerprint.

## Work slices

1. Add the language identity interface and conformance vectors.
2. Migrate backend ASR, alignment, and practice snapshot code.
3. Migrate extension source selection, binding, and timing compatibility.
4. Make the Python Whisper adapter consume the same supported-language data.
5. Replace source selection persistence with stable, versioned identity and
   migrate existing values.
6. Correct ASR artifact identity and add negative cache-reuse tests.
7. Run cross-runtime tests and a live reload smoke test on representative
   languages.

## Acceptance criteria

- No independent alias map or language normalizer remains outside the language
  module/adapters.
- Reload restores the selected caption source and compatible ASR timing.
- Regional and script variants are not silently mixed.
- Unknown language tags fail clearly at ASR boundaries while caption retrieval
  remains available where possible.
- Reusing ASR never depends on a display label alone.

## Current progress

- Existing locale normalization and source-selection regression are covered.
- The first backend language identity module and its conformance matrix are
  implemented in `app/src/lib/language/languageIdentity.ts`.
- `asrJobs.ts` now consumes that module.
- The extension has a matching language identity adapter, uses it for source
  restoration and compatibility checks, and rejects ambiguous regional/script
  fallbacks.
- Alias and Whisper support data now has one source under `app/scripts` and is
  synchronized into the no-build extension artifact.
- The alignment script and Python adapter consume that shared data.
- ASR artifact identity and the full live reload smoke remain to be migrated.
