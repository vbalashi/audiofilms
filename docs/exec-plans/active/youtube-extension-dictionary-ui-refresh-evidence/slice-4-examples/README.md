# Slice 4 Evidence: Examples Expand/Collapse

Checked on June 22, 2026 against the local unpacked YouTube extension in Chrome
using the existing YouTube `opbouwen` scenario.

## Verification

- `node --check extensions/youtube-shadowing/src/content.js`
- Reloaded extension `hhdkchoccmikoefhenobdjipgdppdpoc` in Chrome.
- Opened the `opbouwen` lookup from phrase `51 / 157`.
- Confirmed the ready panel still shows `opbouwen` and `3 cards found`.
- Confirmed each card uses an explicit `Examples` button instead of native
  `Details`.
- Confirmed `.af-overlay-section-label` count is `0`, so per-example `Example`
  headings are gone.
- Confirmed the panel-level examples button expands all visible cards.
- Reloaded the page and confirmed `localStorage.afDictionaryExamplesExpanded`
  persists the expanded state.

## Artifacts

- `opbouwen-examples-dom.json`: DOM smoke result after persisted expanded state.
- `opbouwen-examples-expanded.png`: desktop screenshot after global expansion.
