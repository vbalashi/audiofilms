# Slice 7 Evidence: Shared Theme And Control Shape

Checked on June 22, 2026 against the local unpacked YouTube extension in Chrome.

## Verification

- `node --check extensions/youtube-shadowing/src/content.js`
- Reloaded extension `hhdkchoccmikoefhenobdjipgdppdpoc` in Chrome.
- Set `localStorage.afShadowingTheme = "light"`, reloaded the page, and opened
  the `opbouwen` lookup.
- Confirmed document and shadow host both carry `data-af-theme="light"`.
- Confirmed dictionary and ribbon backgrounds resolve to the light token set.
- Clicked the theme button once and confirmed persisted `dark` state.
- Confirmed document and shadow host both carry `data-af-theme="dark"`.
- Confirmed dictionary and ribbon backgrounds resolve to the dark token set.
- Confirmed the old `Phrase navigation` mode chip is hidden.
- Confirmed source toggle, mode group, chips, and floating `AudioFilms` toggle
  use compact rectangular radii.

## Artifacts

- `light-theme-dom.json`: DOM/style smoke for light override.
- `dark-theme-dom.json`: DOM/style smoke for dark override.
- `light-theme.png`: desktop screenshot in light override.
- `dark-theme.png`: desktop screenshot in dark override.
