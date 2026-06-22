# Slice 6 Evidence: Progress Actions And Feedback

Checked on June 22, 2026 against the local unpacked YouTube extension in Chrome.
The click smoke used `localStorage.afShadowingDictionaryMock = "cards"` so no
real 2000NL progress state was mutated.

## Verification

- `node --check extensions/youtube-shadowing/src/content.js`
- `npm run test:dictionary -- --run tests/dictionary/overlayProjection.test.ts`
  from `app/` (the script ran the full configured dictionary/practice subset:
  8 files, 24 tests).
- Reloaded extension `hhdkchoccmikoefhenobdjipgdppdpoc` in Chrome.
- Opened the mock `opbouwen` lookup.
- Confirmed the first card shows `Learn`/`Known` and the second card shows
  `Again`/`Hard`/`Good`/`Easy`.
- Confirmed no visible `Progress` label renders in card action sections.
- Clicked `Learn` on the first card and confirmed card-level saved feedback
  `Started learning`.
- Clicked `Hard` on the second card and confirmed card-level saved feedback
  `Hard recorded`.
- Confirmed the ready body stays on `.af-overlay-card` and does not jump back to
  the selected-word/context loading layout during refresh.

## Zware/Zwaar Check

The existing baseline `slice-0-baseline/youtube-dom-snapshot.json` shows mixed
action state for the same `zware` lookup: most cards rendered `Learn`/`Known`,
while the `dwingend` card rendered `Again`/`Hard`/`Good`/`Easy`. That means the
extension is rendering the backend-projected `displayActions` per card rather
than deriving review state from the clicked form. A direct unauthenticated
remote `POST /api/dict/lookup` for `zware` returned `guest_lookup_unavailable`,
so a fresh personalized backend payload needs a forwarded user bearer or browser
service-worker capture.

## Artifacts

- `mock-progress-dom.json`: DOM smoke after mock `Learn` and `Hard` clicks.
- `mock-progress-feedback.png`: desktop screenshot after saved feedback.
