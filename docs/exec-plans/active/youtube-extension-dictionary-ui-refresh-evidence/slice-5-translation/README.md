# Slice 5 Evidence: Translation Reveal

Checked on June 22, 2026 against the local unpacked YouTube extension in Chrome
using the existing YouTube `opbouwen` scenario.

## Verification

- `node --check extensions/youtube-shadowing/src/content.js`
- Reloaded extension `hhdkchoccmikoefhenobdjipgdppdpoc` in Chrome.
- Opened the `opbouwen` lookup from phrase `51 / 157`.
- Confirmed the translate control is an icon button with accessible label
  `Show translation` and no visible long `Translate` label.
- Clicked the first card translation button and confirmed the card-level
  translation appeared under the card definition/example area.
- Clicked the same button again and confirmed the translation block disappeared.
- Clicked a third time and confirmed the previously loaded translation appeared
  again without visible loading or error state.

## Payload Note

The current response provides card-level overlay text. The extension therefore
renders a contained card translation block below the source card text. More
specific placement under individual sections/examples should wait for stable
backend-projected section ids or source paths.

## Artifacts

- `opbouwen-translation-dom.json`: DOM smoke after translation is visible.
- `opbouwen-translation-visible.png`: desktop screenshot with the translation
  block visible.
