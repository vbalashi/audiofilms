# Tech Debt

## Active Debt

### Validation Baseline Is Red

- `app/npm run lint` currently fails on existing issues in provider code.
- Until that is fixed, agents cannot treat lint as a clean merge gate.

### Documentation Drift

- root `README.md` describes an older MVP architecture and setup model.
- `app/README.md` is closer to the current runtime but is still not the authoritative architecture map.
- Several top-level `DICTIONARY_*.md` files contain useful history, but they are not organized as stable repo guidance.

### Environment And Provider Complexity

- subtitle behavior depends on provider selection, credentials, and optional `yt-dlp` availability.
- dictionary behavior depends on provider selection and model defaults.
- this is manageable, but it should stay centralized and not leak into ad hoc docs.

## Next Good Cleanup Steps

- fix current ESLint errors and warnings so `npm run lint` becomes trustworthy,
- consolidate README material so one doc explains current setup and one doc explains product context,
- decide whether the `DICTIONARY_*.md` files should move under `docs/` or be reduced into one maintained document.
