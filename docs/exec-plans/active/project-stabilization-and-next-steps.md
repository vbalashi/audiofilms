# Project Stabilization And Next Steps

## Goal

Turn the current working tree into a stable base for continued feature work without mixing architecture cleanup, provider work, and UI evolution in one stream.

## Why This Plan Exists

The repo now has Harness navigation docs, but the application itself still has three competing needs:

1. existing validation is red,
2. provider and dictionary integrations are mid-flight,
3. product/docs boundaries are not yet fully normalized.

Until those are addressed, new feature work will keep landing on unstable ground.

## Priority 1: Restore A Trustworthy Validation Baseline

Scope:

- fix current `npm run lint` failures in provider code,
- remove dead variables and `any` usage where ESLint is already complaining,
- run `npm run build` and record whether the app builds cleanly.

Expected files:

- `app/src/lib/providers/SupadataProvider.ts`
- `app/src/lib/providers/YtDlpProvider.ts`
- `app/src/components/PlayerLayout.tsx`
- `app/src/lib/subtitleCache.ts`

Exit criteria:

- `cd app && npm run lint` passes,
- `cd app && npm run build` passes or any blocker is documented.

## Priority 2: Normalize The Provider Model

Scope:

- confirm the intended default subtitle provider,
- confirm the intended default dictionary provider,
- align code defaults, `env.example`, and docs,
- reduce contradictory statements across readmes and dictionary docs.

Questions to resolve:

- Is `supadata` the real default subtitle path, or should `yt-dlp` remain the primary local/dev default?
- Is OpenRouter the intended default dictionary path, or should free-dictionary be the safe default until prompt/cost behavior is fully validated?

Expected files:

- `app/env.example`
- `app/README.md`
- `README.md`
- `app/src/lib/providers/index.ts`
- `app/src/lib/providers/dictionary/index.ts`
- `app/src/lib/providers/dictionary/README.md`

Exit criteria:

- one documented default per provider type,
- setup docs match runtime behavior,
- no major doc/code contradiction remains around provider selection.

## Priority 3: Lock Down Module Boundaries

Scope:

- define the intended ownership of subtitle retrieval, metadata retrieval, dictionary lookup, playback state, and UI rendering,
- identify any logic that should move out of components into helpers or service modules,
- keep API contracts centered in `app/src/types/`.

Target module map:

- UI: `app/src/app/`, `app/src/components/`
- state: `app/src/store/`
- subtitle services: `app/src/lib/providers/`, `app/src/lib/subtitleCache.ts`
- metadata services: `app/src/lib/youtubeMetadata.ts`, `app/src/lib/videoInfoCache.ts`
- dictionary services: `app/src/lib/providers/dictionary/`
- API boundaries: `app/src/app/api/`

Likely changes:

- move parsing/normalization helpers out of route handlers if they grow,
- reduce dictionary response-shape compatibility code inside `PlayerLayout`,
- keep provider-specific response handling out of UI components.

Exit criteria:

- each major concern has one obvious home,
- route handlers orchestrate instead of owning low-level transformation logic,
- UI is not aware of vendor-specific response details.

## Priority 4: Consolidate Documentation

Scope:

- decide which README is canonical for setup,
- move dictionary implementation/history notes under `docs/` or condense them,
- leave only current guidance at top level.

Expected files:

- `README.md`
- `app/README.md`
- top-level `DICTIONARY_*.md`

Exit criteria:

- one canonical setup path,
- one canonical architecture path,
- historical notes are either archived or intentionally organized.

## Priority 5: Product Evolution After Stabilization

Only start after priorities 1-4 are in acceptable shape.

Once priorities 1-4 are complete, the codebase should be stable enough to resume product work instead of continuing platform repair. The next feature choices should favor direct user-facing value and use the service boundaries already established by the stabilization work.

Recommended feature directions:

1. `dictionary result caching`
2. `provider fallback policy and user-facing error states`

Why this order:

- `dictionary result caching` is the fastest product win because the dictionary flow is already normalized behind server-side orchestration and app-facing contracts. Adding cache behavior at `/api/dict` and the service layer improves lookup latency, reduces repeated provider calls, and lowers sensitivity to OpenRouter cost and rate behavior without pushing vendor logic back into UI components.
- `provider fallback policy and user-facing error states` should follow immediately after. The provider and service structure now exists, but the product-level degradation policy is still implicit. The next step is to make fallback rules explicit across subtitle and dictionary providers and pair them with recoverable, user-readable UI states.

Lower-priority follow-ons after those two items:

- better language selection UX,
- phrase segmentation and playback quality improvements,
- keyboard and accessibility polish,
- persistence or saved sessions if still in scope.

## Recommended Execution Order

1. Fix validation baseline.
2. Align provider defaults and setup docs.
3. Refactor module boundaries where current work is leaking across layers.
4. Consolidate docs.
5. Resume feature development.
